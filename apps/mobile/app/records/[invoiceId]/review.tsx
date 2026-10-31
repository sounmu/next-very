import { formatUnitPrice, formatWon, unitLabel, type BaseUnit, type Unit } from '@marginlog/core';
import type { InvoiceConfirm, InvoiceDetailResponse } from '@marginlog/core/src/api/invoices';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { invoiceImageUrl, useConfirmInvoice, useIngredientOptions, useInvoice } from '@/api/records';
import {
  Button,
  Card,
  Chip,
  Header,
  MoneyField,
  Screen,
  SegmentedControl,
  Sheet,
  StateView,
  TextField,
  colors,
  control,
  deltaColor,
  iconSize,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

import {
  IngredientPickerSheet,
  isIsoDate,
  livePrice,
  parseNumber,
  priceDelta,
  unitOptions,
  type UnitChoice,
} from '../../purchases/new';

type Draft = {
  key: string;
  rawName: string;
  ingredientId: string | null;
  newIngredient: { name: string; baseUnit: BaseUnit } | null;
  suggestedIngredientId: string | null;
  packSize: string;
  packUnit: Unit | null;
  quantity: string;
  amount: number | null;
  saveAlias: boolean;
  issues: string[];
  lowConfidence: boolean;
  previousUnitPricePerBase: number | null;
};

let draftSeq = 0;

function draftsFrom(detail: InvoiceDetailResponse): Draft[] {
  return detail.items.map((row) => ({
    key: `item-${row.index}`,
    rawName: row.item.rawName,
    ingredientId: row.suggestedIngredientId,
    newIngredient: null,
    suggestedIngredientId: row.suggestedIngredientId,
    packSize: row.item.packSize === null ? '' : String(row.item.packSize),
    packUnit: row.item.packUnit,
    quantity: String(row.item.quantity),
    amount: row.item.amount > 0 ? row.item.amount : null,
    saveAlias: false,
    issues: row.item.note ? [...row.issues, row.item.note] : row.issues,
    lowConfidence: row.item.confidence === 'low',
    previousUnitPricePerBase: row.previousUnitPricePerBase,
  }));
}

export default function ReceiptReviewScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const detail = useInvoice(invoiceId);
  const header = (onBack?: () => void) => <Header backLabel="구매 기록" title="인식 결과 확인" onBack={onBack} />;

  if (detail.isPending) {
    return (
      <Screen>
        {header()}
        <Card>
          <StateView kind="loading" title="인식 결과를 불러오고 있어요" />
        </Card>
      </Screen>
    );
  }
  if (detail.isError) {
    return (
      <Screen>
        {header()}
        <Card>
          <StateView
            kind="error"
            title={detail.error instanceof ApiError && detail.error.status === 404 ? '이 명세서를 찾을 수 없어요' : '인식 결과를 불러오지 못했어요'}
            message={detail.error.message}
            actionLabel="다시 시도"
            onAction={() => detail.refetch()}
          />
        </Card>
      </Screen>
    );
  }
  if (detail.data.invoice.status === 'confirmed') {
    return (
      <Screen>
        {header()}
        <Card>
          <StateView
            kind="empty"
            title="이미 저장한 명세서예요"
            message="같은 명세서는 두 번 저장되지 않아요. 저장한 품목은 구매 기록에 있어요."
            actionLabel="기록으로"
            onAction={() => router.replace('/records')}
          />
        </Card>
      </Screen>
    );
  }
  return <ReviewForm key={detail.data.invoice.id} detail={detail.data} header={header} />;
}

function ReviewForm({ detail, header }: { detail: InvoiceDetailResponse; header: (onBack?: () => void) => React.ReactNode }) {
  const { invoice, supplier } = detail;
  const ingredients = useIngredientOptions();
  const confirm = useConfirmInvoice(invoice.id);

  const initialDate = invoice.date ?? (isIsoDate(invoice.extraction.date) ? invoice.extraction.date : '');
  const [supplierName, setSupplierName] = useState(supplier.name);
  const [date, setDate] = useState(initialDate);
  const [drafts, setDrafts] = useState(() => draftsFrom(detail));
  const [dirty, setDirty] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const ingredientById = new Map((ingredients.data?.ingredients ?? []).map((item) => [item.id, item]));

  function patch(key: string, change: Partial<Draft>) {
    setDirty(true);
    setDrafts((list) => list.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  }

  function baseUnitOf(draft: Draft): BaseUnit | null {
    if (draft.newIngredient) return draft.newIngredient.baseUnit;
    if (!draft.ingredientId) return null;
    const known = ingredientById.get(draft.ingredientId)?.baseUnit;
    if (known) return known;
    const row = detail.items.find((item) => item.suggestedIngredientId === draft.ingredientId);
    return row?.baseUnit ?? null;
  }

  function nameOf(draft: Draft): string | null {
    if (draft.newIngredient) return draft.newIngredient.name;
    if (!draft.ingredientId) return null;
    return (
      ingredientById.get(draft.ingredientId)?.name ??
      detail.items.find((item) => item.suggestedIngredientId === draft.ingredientId)?.ingredientName ??
      null
    );
  }

  function previousOf(draft: Draft): number | null {
    if (draft.newIngredient || !draft.ingredientId) return null;
    if (draft.ingredientId === draft.suggestedIngredientId) return draft.previousUnitPricePerBase;
    return ingredientById.get(draft.ingredientId)?.latest?.unitPricePerBase ?? null;
  }

  const evaluated = drafts.map((draft) => {
    const baseUnit = baseUnitOf(draft);
    const size = parseNumber(draft.packSize);
    const quantity = parseNumber(draft.quantity);
    const price = livePrice(size, draft.packUnit, quantity, draft.amount, baseUnit);
    const missing =
      draft.rawName.trim() === '' ||
      (!draft.ingredientId && !draft.newIngredient) ||
      !size ||
      size <= 0 ||
      !draft.packUnit ||
      !quantity ||
      quantity <= 0 ||
      !draft.amount;
    return { draft, baseUnit, size, quantity, price, missing };
  });

  const itemsTotal = drafts.reduce((sum, draft) => sum + (draft.amount ?? 0), 0);
  const trimmedSupplier = supplierName.trim();
  const blocker =
    drafts.length === 0
      ? '품목을 하나 이상 남겨 주세요'
      : trimmedSupplier === ''
        ? '구매처를 입력해 주세요'
        : !isIsoDate(date)
          ? '구매일을 2026-10-31 형식으로 입력해 주세요'
          : evaluated.some((entry) => entry.price.kind === 'mismatch')
            ? '단위가 재료 기준 단위와 달라요'
            : evaluated.some((entry) => entry.missing)
              ? '모든 품목에 식재료, 포장 용량, 단위, 수량, 금액을 넣어 주세요'
              : null;

  function submit() {
    if (blocker) return;
    const supplierField: Pick<InvoiceConfirm, 'supplierId' | 'supplierName'> =
      supplier.registered && supplier.id && trimmedSupplier === supplier.name
        ? { supplierId: supplier.id }
        : { supplierName: trimmedSupplier };
    const body: InvoiceConfirm = {
      ...supplierField,
      date,
      items: evaluated.map(({ draft, size, quantity }) => ({
        ...(draft.newIngredient ? { newIngredient: draft.newIngredient } : { ingredientId: draft.ingredientId ?? undefined }),
        rawName: draft.rawName.trim(),
        packSize: size ?? 0,
        packUnit: draft.packUnit ?? 'g',
        quantity: quantity ?? 0,
        amount: draft.amount ?? 0,
        saveAlias: draft.saveAlias,
      })),
    };
    confirm.mutate(body, {
      onSuccess: () => router.replace({ pathname: '/records/[invoiceId]/done', params: { invoiceId: invoice.id } }),
    });
  }

  function addItem() {
    setDirty(true);
    draftSeq += 1;
    setDrafts((list) => [
      ...list,
      {
        key: `new-${draftSeq}`,
        rawName: '',
        ingredientId: null,
        newIngredient: null,
        suggestedIngredientId: null,
        packSize: '',
        packUnit: null,
        quantity: '1',
        amount: null,
        saveAlias: false,
        issues: [],
        lowConfidence: false,
        previousUnitPricePerBase: null,
      },
    ]);
  }

  const pickerDraft = drafts.find((draft) => draft.key === pickerFor) ?? null;

  return (
    <Screen
      actions={
        <>
          {blocker ? <Text style={styles.reason}>{blocker}</Text> : null}
          {confirm.error ? <Text style={styles.error}>{`저장하지 못했어요. ${confirm.error.message}`}</Text> : null}
          <Button label="확인 후 저장" onPress={submit} disabled={blocker !== null} loading={confirm.isPending} />
        </>
      }
    >
      {header(dirty ? () => setLeaveOpen(true) : undefined)}

      <Card style={styles.gap}>
        {invoice.hasImage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="원본 사진 크게 보기"
            onPress={() => setImageOpen(true)}
            style={({ pressed }) => [styles.thumbRow, pressed && styles.pressed]}
          >
            <Image source={{ uri: invoiceImageUrl(invoice.id) }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.flex}>
              <Text style={typography.bodyStrong}>원본 사진</Text>
              <Text style={typography.caption}>눌러서 크게 보기</Text>
            </View>
          </Pressable>
        ) : null}
        <TextField
          label="구매처"
          value={supplierName}
          onChangeText={(text) => {
            setDirty(true);
            setSupplierName(text);
          }}
          placeholder="예: 한우리축산"
          hint={
            supplier.registered && trimmedSupplier === supplier.name
              ? '등록된 구매처에 연결돼요'
              : trimmedSupplier
                ? '처음 보는 구매처는 저장할 때 새로 등록돼요'
                : undefined
          }
        />
        <TextField
          label="구매일"
          value={date}
          onChangeText={(text) => {
            setDirty(true);
            setDate(text);
          }}
          placeholder="2026-10-31"
          error={date !== '' && !isIsoDate(date) ? '2026-10-31 형식으로 입력해 주세요' : date === '' ? '구매일을 확인해 주세요' : undefined}
        />
        <View style={styles.totalRow}>
          <Text style={typography.secondary}>품목 합계</Text>
          <Text style={typography.rowAmount}>{formatWon(itemsTotal)}</Text>
        </View>
        {invoice.extraction.total > 0 && invoice.extraction.total !== itemsTotal ? (
          <Text style={styles.warnText}>{`인쇄된 총액 ${formatWon(invoice.extraction.total)}과 품목 합이 달라요. 확인 필요`}</Text>
        ) : null}
      </Card>

      {evaluated.map(({ draft, baseUnit, price, missing }, index) => {
        const flagged = draft.issues.length > 0 || draft.lowConfidence;
        const ingredientName = nameOf(draft);
        const previous = previousOf(draft);
        const delta = price.kind === 'ok' && previous !== null && baseUnit ? priceDelta(price.unitPricePerBase, previous, baseUnit) : null;
        return (
          <Card key={draft.key} style={[styles.gap, flagged && styles.flagged]}>
            <View style={styles.itemHead}>
              <Text style={[typography.bodyStrong, styles.flex]}>{`품목 ${index + 1}`}</Text>
              {flagged || missing ? <Chip label="확인 필요" tone="warning" /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`품목 ${index + 1} 삭제`}
                onPress={() => {
                  setDirty(true);
                  setDrafts((list) => list.filter((item) => item.key !== draft.key));
                }}
                style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
              >
                <Text style={typography.secondary}>삭제</Text>
              </Pressable>
            </View>
            {flagged ? (
              <View style={styles.issueBox}>
                {draft.lowConfidence ? <Text style={styles.warnText}>인식이 불확실해요. 값을 확인해 주세요.</Text> : null}
                {draft.issues.map((issue) => (
                  <Text key={issue} style={styles.warnText}>
                    {issue}
                  </Text>
                ))}
              </View>
            ) : null}

            <TextField label="품목명" value={draft.rawName} onChangeText={(text) => patch(draft.key, { rawName: text })} placeholder="영수증에 적힌 이름" />

            <View style={styles.field}>
              <Text style={typography.secondary}>연결할 식재료</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`품목 ${index + 1} 식재료 선택`}
                onPress={() => setPickerFor(draft.key)}
                style={({ pressed }) => [styles.picker, !ingredientName && styles.pickerWarn, pressed && styles.pressed]}
              >
                <Text style={ingredientName ? [typography.body, styles.flex] : [styles.placeholder, styles.flex]} numberOfLines={1}>
                  {ingredientName ?? '식재료를 골라 주세요'}
                </Text>
                {draft.newIngredient ? <Chip label="새 식재료" tone="info" /> : null}
                {baseUnit ? <Text style={typography.caption}>{`기준 ${unitLabel(baseUnit)}`}</Text> : null}
              </Pressable>
              {draft.ingredientId && draft.ingredientId === draft.suggestedIngredientId && !draft.newIngredient ? (
                <Text style={typography.caption}>등록된 표기로 자동 연결했어요</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <TextField
                label="포장 용량"
                value={draft.packSize}
                onChangeText={(text) => patch(draft.key, { packSize: text })}
                keyboardType="decimal-pad"
                placeholder="예: 10"
                align="right"
                error={draft.packSize.trim() === '' ? '포장 용량을 확인해 주세요' : undefined}
              />
              <SegmentedControl<UnitChoice>
                options={unitOptions}
                value={draft.packUnit ?? 'none'}
                onChange={(value) => value !== 'none' && patch(draft.key, { packUnit: value })}
              />
              {!draft.packUnit ? <Text style={styles.warnText}>단위를 골라 주세요</Text> : null}
            </View>

            <View style={styles.pair}>
              <View style={styles.flex}>
                <TextField
                  label="수량"
                  value={draft.quantity}
                  onChangeText={(text) => patch(draft.key, { quantity: text })}
                  keyboardType="decimal-pad"
                  suffix="개"
                  align="right"
                />
              </View>
              <View style={styles.flex}>
                <MoneyField label="품목 합계 금액" value={draft.amount} onChangeValue={(value) => patch(draft.key, { amount: value })} placeholder="0" />
              </View>
            </View>

            <View style={styles.priceBox}>
              <Text style={typography.secondary}>환산 단가</Text>
              {price.kind === 'ok' && baseUnit ? (
                <>
                  <Text style={typography.rowAmount}>{formatUnitPrice(price.unitPricePerBase, baseUnit)}</Text>
                  {delta ? <Text style={[typography.caption, { color: deltaColor(delta.delta) }]}>{delta.text}</Text> : null}
                </>
              ) : price.kind === 'mismatch' && baseUnit ? (
                <Text style={styles.warnText}>{`단위가 재료 기준 단위와 달라요. 이 재료는 ${unitLabel(baseUnit)} 단위로 계산해요.`}</Text>
              ) : (
                <Text style={typography.caption}>식재료, 포장 용량, 단위, 수량, 금액을 넣으면 계산돼요</Text>
              )}
            </View>

            {draft.ingredientId && !draft.newIngredient && draft.rawName.trim() !== '' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.saveAlias }}
                onPress={() => patch(draft.key, { saveAlias: !draft.saveAlias })}
                style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
              >
                <View style={[styles.box, draft.saveAlias && styles.boxOn]}>
                  {draft.saveAlias ? <Text style={styles.boxMark}>✓</Text> : null}
                </View>
                <Text style={[typography.body, styles.flex]}>이 표기를 다음에도 이 식재료로 인식</Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}

      <Button label="품목 추가" variant="secondary" onPress={addItem} />

      <IngredientPickerSheet
        key={pickerFor ?? 'none'}
        visible={pickerDraft !== null}
        onClose={() => setPickerFor(null)}
        selectedId={pickerDraft?.ingredientId ?? null}
        suggestedName={pickerDraft?.rawName ?? ''}
        onPick={(item) => {
          if (!pickerDraft) return;
          patch(pickerDraft.key, {
            ingredientId: item.id,
            newIngredient: null,
            saveAlias: item.id !== pickerDraft.suggestedIngredientId && !item.aliases.includes(pickerDraft.rawName.trim()),
          });
          setPickerFor(null);
        }}
        onCreate={(created) => {
          if (!pickerDraft) return;
          patch(pickerDraft.key, { ingredientId: null, newIngredient: created, saveAlias: false });
          setPickerFor(null);
        }}
      />

      <Sheet
        visible={leaveOpen}
        title="고친 내용을 버릴까요?"
        onClose={() => setLeaveOpen(false)}
        actions={
          <>
            <Button
              label="버리고 나가기"
              onPress={() => {
                setLeaveOpen(false);
                if (router.canGoBack()) router.back();
                else router.replace('/records');
              }}
            />
            <Button label="계속 확인하기" variant="secondary" onPress={() => setLeaveOpen(false)} />
          </>
        }
      >
        <Text style={typography.body}>저장하지 않은 수정 내용은 사라져요. 명세서는 확인 대기 목록에 남아 있어요.</Text>
      </Sheet>

      {invoice.hasImage ? (
        <Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}>
          <View style={styles.viewer}>
            <Image source={{ uri: invoiceImageUrl(invoice.id) }} style={styles.viewerImage} resizeMode="contain" accessibilityLabel="원본 영수증 사진" />
            <Button label="닫기" variant="secondary" onPress={() => setImageOpen(false)} style={styles.viewerClose} />
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.s4 },
  flex: { flex: 1, minWidth: 0 },
  field: { gap: space.s2 },
  pair: { flexDirection: 'row', gap: space.s3 },
  flagged: { borderWidth: lineWidth * 2, borderColor: colors.warn },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  textAction: { minHeight: control.iconButton, minWidth: control.iconButton, alignItems: 'center', justifyContent: 'center' },
  issueBox: { gap: space.s1, padding: space.s3, borderRadius: radius.sm, backgroundColor: colors.accent50 },
  warnText: { ...typography.caption, color: colors.warn },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  thumb: { width: control.iconButton * 2, height: control.iconButton * 2, borderRadius: radius.sm, backgroundColor: colors.subtle },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  picker: {
    minHeight: control.inputHeight,
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  pickerWarn: { backgroundColor: colors.accent50, borderColor: colors.warn },
  placeholder: { ...typography.body, color: colors.text3 },
  priceBox: { gap: space.s1, paddingTop: space.s3, borderTopWidth: lineWidth, borderTopColor: colors.line },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.s3, minHeight: control.iconButton },
  box: {
    width: iconSize.md,
    height: iconSize.md,
    borderRadius: radius.sm / 2,
    borderWidth: lineWidth * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxMark: { ...typography.caption, color: colors.surface, fontWeight: '700' },
  pressed: { opacity: opacity.pressed },
  reason: { ...typography.caption, textAlign: 'center' },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
  viewer: { flex: 1, backgroundColor: colors.text, padding: space.s4, justifyContent: 'center', gap: space.s4 },
  viewerImage: { flex: 1, width: '100%' },
  viewerClose: { alignSelf: 'center', minWidth: control.iconButton * 3 },
});
