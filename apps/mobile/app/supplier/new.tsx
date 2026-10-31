import {
  computeMenuCost,
  currentAndPrevious,
  previewWithPrice,
  ratioPercent,
  type Menu,
  type Purchase,
  type Supplier,
} from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { ApiError } from '@/api';
import { useCreateQuote, useCreateSupplier, useIngredientDetail } from '@/api/supplier';
import {
  Button,
  Card,
  Header,
  Notice,
  Row,
  Screen,
  colors,
  control,
  fontSize,
  formatWon,
  lineWidth,
  radius,
  space,
  typography,
} from '@/ui';

const BACK_LABEL = '가격 추세';
const TITLE = '다른 구매처 등록';
const FOOTER = '견적 단가 · 명세서 확인 전에는 원가에 반영되지 않음';
const DEFAULT_PACK_KG = '10';

function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${month}/${day}`;
}

function supplierName(suppliers: readonly Supplier[], supplierId: string): string {
  return suppliers.find((s) => s.id === supplierId)?.name ?? '구매처 미상';
}

function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return '재료를 찾을 수 없어요';
  return error instanceof Error ? error.message : '저장하지 못했어요';
}

function parseUnitPrice(digits: string): number | null {
  const value = Number(digits);
  return digits !== '' && Number.isInteger(value) && value > 0 ? value : null;
}

function parsePackWeightG(kg: string): number | null {
  const value = Number(kg);
  if (kg === '' || !Number.isFinite(value) || value <= 0) return null;
  const grams = Math.round(value * 1000);
  return grams > 0 ? grams : null;
}

function optional(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed ? trimmed : undefined;
}

/** Warning-type status chip (DESIGN.md state.warningBg). */
function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function CardHead({ title, chip }: { title: string; chip: string }) {
  return (
    <View style={styles.cardHead}>
      <Text style={typography.cardTitle}>{title}</Text>
      <Chip label={chip} />
    </View>
  );
}

function changeColor(diff: number): string {
  if (diff < 0) return colors.primary;
  if (diff > 0) return colors.loss;
  return colors.text2;
}

type FieldProps = { label: string; required?: boolean; hint?: string; children: ReactNode };

function Field({ label, required = false, hint, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={typography.secondary}>{`${label} (${required ? '필수' : '선택'})`}</Text>
      {children}
      {hint ? <Notice>{hint}</Notice> : null}
    </View>
  );
}

function Input({ suffix, style, ...props }: TextInputProps & { suffix?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
      <TextInput
        {...props}
        style={[styles.input, style]}
        placeholderTextColor={colors.text3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
    </View>
  );
}

type MenuPreviewProps = {
  menu: Menu;
  allPurchases: readonly Purchase[];
  ingredientId: string;
  unitPrice: number;
  last: boolean;
};

function MenuPreview({ menu, allPurchases, ingredientId, unitPrice, last }: MenuPreviewProps) {
  const current = computeMenuCost(menu, allPurchases);
  const preview = previewWithPrice(menu, allPurchases, ingredientId, unitPrice);
  if (current.total === null || preview.total === null) {
    return <Row label={menu.name} value={`매입가 미등록 재료 ${current.missing.length}개`} divider={!last} />;
  }

  const diff = preview.total - current.total;
  const grams = menu.recipe.find((line) => line.ingredientId === ingredientId)?.grams ?? 0;
  const currentUnitPrice = current.lines.find((line) => line.ingredientId === ingredientId)?.unitPrice ?? null;
  const deltaText =
    diff === 0
      ? '한 그릇당 변화 없음'
      : `한 그릇당 ${formatWon(Math.abs(diff))} ${diff < 0 ? '감소' : '증가'}`;

  return (
    <View style={[styles.previewItem, !last && styles.previewDivider]}>
      <Text style={typography.bodyStrong}>{menu.name}</Text>
      <Text style={typography.amountLg}>
        {`${formatWon(current.total, { unit: '' })} → ${formatWon(preview.total)}`}
      </Text>
      <Text style={styles.subline}>
        {`원가율 ${ratioPercent(current.total, menu.price)}% → ${ratioPercent(preview.total, menu.price)}%`}
      </Text>
      <Text style={[styles.previewDelta, { color: changeColor(diff) }]}>{deltaText}</Text>
      {currentUnitPrice !== null ? (
        <Notice>{`사용량 ${grams}g × kg당 ${formatWon(Math.abs(currentUnitPrice - unitPrice))} 차이`}</Notice>
      ) : null}
    </View>
  );
}

type SavedQuote = { supplierName: string; unitPrice: number; packWeightG: number; terms?: string };

export default function SupplierNewScreen() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId?: string }>();
  const detail = useIngredientDetail(ingredientId);
  const createSupplier = useCreateSupplier();
  const createQuote = useCreateQuote();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priceDigits, setPriceDigits] = useState('');
  const [packKg, setPackKg] = useState(DEFAULT_PACK_KG);
  const [terms, setTerms] = useState('');
  const [createdSupplierId, setCreatedSupplierId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQuote | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!ingredientId) {
    return (
      <Screen actions={<Button variant="secondary" label="메뉴 목록으로" onPress={() => router.replace('/')} />}>
        <Header backLabel={BACK_LABEL} title={TITLE} />
        <Card>
          <Notice align="center">재료를 찾을 수 없어요</Notice>
        </Card>
      </Screen>
    );
  }

  if (detail.isPending) {
    return (
      <Screen>
        <Header backLabel={BACK_LABEL} title={TITLE} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (detail.isError) {
    return (
      <Screen>
        <Header backLabel={BACK_LABEL} title={TITLE} />
        <Card>
          <Notice>{errorMessage(detail.error)}</Notice>
          <Button
            variant="secondary"
            label="다시 시도"
            loading={detail.isRefetching}
            onPress={() => detail.refetch()}
            style={styles.retry}
          />
        </Card>
      </Screen>
    );
  }

  const { ingredient, purchases, suppliers, menus, allPurchases } = detail.data;
  const { current } = currentAndPrevious(ingredient.id, purchases);
  const unitPrice = saved ? saved.unitPrice : parseUnitPrice(priceDigits);
  const packWeightG = parsePackWeightG(packKg);
  const canSave = name.trim().length > 0 && unitPrice !== null && packWeightG !== null;
  const saving = createSupplier.isPending || createQuote.isPending;

  const save = async () => {
    if (!canSave || unitPrice === null || packWeightG === null) return;
    setSaveError(null);
    try {
      let supplierId = createdSupplierId;
      if (!supplierId) {
        const created = await createSupplier.mutateAsync({
          name: name.trim(),
          phone: optional(phone),
          memo: optional(terms),
        });
        supplierId = created.supplier.id;
        setCreatedSupplierId(supplierId);
      }
      await createQuote.mutateAsync({
        supplierId,
        ingredientId: ingredient.id,
        unitPrice,
        packWeightG,
        terms: optional(terms),
        date: todayIsoDate(),
      });
      setSaved({ supplierName: name.trim(), unitPrice, packWeightG, terms: optional(terms) });
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  };

  const actions = saved ? (
    <Button label="이 구매처 명세서 등록하기" onPress={() => router.push('/invoice/new')} />
  ) : (
    <>
      {saveError ? <Notice style={styles.errorText}>{saveError}</Notice> : null}
      <Button label="구매처 저장" disabled={!canSave} loading={saving} onPress={save} />
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen actions={actions}>
        <Header
          backLabel={BACK_LABEL}
          title={TITLE}
          subtitle={[ingredient.name, ingredient.spec].filter(Boolean).join(' · ')}
        />

        <Card title="현재 구매처">
          {current ? (
            <Row
              label={supplierName(suppliers, current.supplierId)}
              hint={`${shortDate(current.date)} 매입`}
              value={formatWon(current.unitPrice, { unit: '원/kg' })}
              divider={false}
            />
          ) : (
            <Notice>확인된 매입이 없어요</Notice>
          )}
        </Card>

        {saved ? (
          <Card variant="emphasis">
            <CardHead title="새 구매처" chip="견적" />
            <Text style={typography.sectionTitle}>저장했어요</Text>
            <Text style={styles.subline}>명세서 확인 전에는 원가에 반영되지 않아요</Text>
            <Row label="구매처" value={saved.supplierName} />
            <Row label="받은 단가" value={formatWon(saved.unitPrice, { unit: '원/kg' })} />
            <Row label="규격" value={`${saved.packWeightG / 1000}kg 박스`} divider={saved.terms !== undefined} />
            {saved.terms ? <Row label="조건 메모" hint={saved.terms} divider={false} /> : null}
          </Card>
        ) : (
          <Card title="새 구매처">
            <View style={styles.form}>
              <Field label="구매처 이름" required>
                <Input value={name} onChangeText={setName} placeholder="한우리축산" autoCapitalize="none" returnKeyType="next" />
              </Field>
              <Field label="연락처">
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="010-0000-0000"
                  keyboardType="phone-pad"
                  inputMode="tel"
                />
              </Field>
              <Field label="받은 단가" required>
                <Input
                  value={priceDigits ? formatWon(Number(priceDigits), { unit: '' }) : ''}
                  onChangeText={(text) => setPriceDigits(text.replace(/\D/g, ''))}
                  placeholder="9,000"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  suffix="원/kg"
                  style={styles.inputMoney}
                />
              </Field>
              <Field label="규격" required hint="박스 단위 규격">
                <Input
                  value={packKg}
                  onChangeText={(text) => setPackKg(text.replace(/[^\d.]/g, ''))}
                  placeholder={DEFAULT_PACK_KG}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  suffix="kg"
                />
              </Field>
              <Field label="조건 메모">
                <Input value={terms} onChangeText={setTerms} placeholder="최소주문 10kg · 배송비 없음 · 익일배송" />
              </Field>
            </View>
          </Card>
        )}

        {unitPrice !== null ? (
          <Card variant="emphasis">
            <CardHead title="이 단가로 사면" chip="견적" />
            {menus.length > 0 ? (
              menus.map((menu, i) => (
                <MenuPreview
                  key={menu.id}
                  menu={menu}
                  allPurchases={allPurchases}
                  ingredientId={ingredient.id}
                  unitPrice={unitPrice}
                  last={i === menus.length - 1}
                />
              ))
            ) : (
              <Notice>이 재료를 쓰는 메뉴가 없어요</Notice>
            )}
          </Card>
        ) : null}

        <Card title="확인할 것">
          <Row label="같은 규격·등급인지" />
          <Row label="배송비·최소주문·품질 조건" divider={false} />
        </Card>

        <Notice align="center" style={styles.footer}>
          {FOOTER}
        </Notice>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { paddingVertical: space.s8, alignItems: 'center' },
  retry: { marginTop: space.s3 },
  form: { gap: space.s4 },
  field: { gap: space.s2 },
  inputBox: {
    height: control.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: lineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s4,
    gap: space.s2,
  },
  inputBoxFocused: { borderColor: colors.primary, borderWidth: lineWidth * 2 },
  input: { ...typography.body, flex: 1, minWidth: 0, height: '100%' },
  inputMoney: { ...typography.amount, fontSize: fontSize.body, textAlign: 'right' },
  inputSuffix: { ...typography.body, color: colors.text2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s2, marginBottom: space.s2 },
  chip: {
    height: control.chipHeight,
    borderRadius: radius.full,
    paddingHorizontal: space.s2,
    justifyContent: 'center',
    backgroundColor: colors.accent50,
  },
  chipText: { ...typography.caption, fontSize: fontSize.xs, fontWeight: '600', color: colors.warn },
  previewItem: { gap: space.s1, paddingVertical: space.s3 },
  previewDivider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  subline: { ...typography.body, color: colors.text2 },
  previewDelta: { ...typography.bodyStrong, fontVariant: ['tabular-nums'] },
  errorText: { color: colors.loss },
  footer: { marginTop: space.s2 },
});
