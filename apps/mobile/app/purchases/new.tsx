import { formatUnitPrice, formatWon, toBase, unitLabel, type BaseUnit, type Unit } from '@marginlog/core';
import type { IngredientListItem } from '@marginlog/core/src/api/ingredients';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCreateIngredient, useCreatePurchase, useIngredientOptions, usePurchases } from '@/api/records';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  MoneyField,
  Screen,
  SegmentedControl,
  Sheet,
  StateView,
  TextField,
  colors,
  control,
  deltaColor,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
  type SegmentOption,
} from '@/ui';

export type UnitChoice = Unit | 'none';

export const unitOptions: SegmentOption<UnitChoice>[] = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'mL', label: 'mL' },
  { value: 'L', label: 'L' },
  { value: 'ea', label: '개' },
];

export const baseUnitOptions: SegmentOption<BaseUnit>[] = [
  { value: 'g', label: 'g' },
  { value: 'mL', label: 'mL' },
  { value: 'ea', label: '개' },
];

export function parseNumber(text: string): number | null {
  const value = Number(text.replace(/,/g, '').trim());
  return text.trim() === '' || !Number.isFinite(value) ? null : value;
}

export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type LivePrice =
  | { kind: 'incomplete' }
  | { kind: 'mismatch' }
  | { kind: 'ok'; unitPricePerBase: number };

export function livePrice(
  packSize: number | null,
  packUnit: Unit | null,
  quantity: number | null,
  amount: number | null,
  baseUnit: BaseUnit | null,
): LivePrice {
  if (!packUnit || !baseUnit) return { kind: 'incomplete' };
  const packBase = toBase(1, packUnit, baseUnit);
  if (packBase === null) return { kind: 'mismatch' };
  if (!packSize || packSize <= 0 || !quantity || quantity <= 0 || !amount || amount <= 0) return { kind: 'incomplete' };
  return { kind: 'ok', unitPricePerBase: amount / (packSize * packBase * quantity) };
}

/** "이전보다 100g당 120원 높음", scaled like formatUnitPrice. */
export function priceDelta(current: number, previous: number, baseUnit: BaseUnit): { text: string; delta: number } {
  const delta = current - previous;
  const scaled = Math.round(Math.abs(baseUnit === 'ea' ? delta : delta * 100));
  if (scaled === 0) return { text: '이전 단가와 같아요', delta: 0 };
  const basis = baseUnit === 'ea' ? '개당' : `100${baseUnit}당`;
  return { text: `이전보다 ${basis} ${formatWon(scaled)} ${delta > 0 ? '높음' : '낮음'}`, delta };
}

type IngredientPickerProps = {
  visible: boolean;
  onClose: () => void;
  selectedId: string | null;
  /** Prefills the new ingredient name, e.g. the printed item name. */
  suggestedName?: string;
  onPick: (ingredient: IngredientListItem) => void;
  onCreate: (ingredient: { name: string; baseUnit: BaseUnit }) => void;
  creating?: boolean;
  createError?: string | null;
};

export function IngredientPickerSheet({
  visible,
  onClose,
  selectedId,
  suggestedName = '',
  onPick,
  onCreate,
  creating = false,
  createError = null,
}: IngredientPickerProps) {
  const ingredients = useIngredientOptions();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState(suggestedName);
  const [newBase, setNewBase] = useState<BaseUnit>('g');

  const list = useMemo(() => {
    const term = search.trim();
    const all = ingredients.data?.ingredients ?? [];
    if (!term) return all;
    return all.filter((item) => item.name.includes(term) || item.aliases.some((alias) => alias.includes(term)));
  }, [ingredients.data, search]);

  return (
    <Sheet visible={visible} title="식재료 선택" onClose={onClose}>
      <TextField label="찾기" value={search} onChangeText={setSearch} placeholder="재료 이름이나 별칭" />
      {ingredients.isPending ? (
        <StateView kind="loading" title="식재료를 불러오고 있어요" />
      ) : ingredients.isError ? (
        <StateView
          kind="error"
          title="식재료를 불러오지 못했어요"
          message={ingredients.error.message}
          actionLabel="다시 시도"
          onAction={() => ingredients.refetch()}
        />
      ) : list.length === 0 ? (
        <Text style={typography.caption}>맞는 식재료가 없어요. 아래에서 새로 등록해 주세요.</Text>
      ) : (
        <View>
          {list.map((item, index) => (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={`기준 단위 ${unitLabel(item.baseUnit)}${item.spec ? ` · ${item.spec}` : ''}`}
              value={item.id === selectedId ? <Chip label="선택됨" tone="info" /> : undefined}
              divider={index < list.length - 1}
              onPress={() => onPick(item)}
            />
          ))}
        </View>
      )}
      <View style={styles.newBox}>
        <Text style={typography.bodyStrong}>새 식재료로 등록</Text>
        <TextField label="식재료 이름" value={newName} onChangeText={setNewName} placeholder="예: 돼지고기 앞다리" />
        <Text style={typography.secondary}>기준 단위</Text>
        <SegmentedControl options={baseUnitOptions} value={newBase} onChange={setNewBase} />
        {createError ? <Text style={styles.error}>{createError}</Text> : null}
        <Button
          label="새 식재료로 등록"
          variant="secondary"
          disabled={newName.trim() === ''}
          loading={creating}
          onPress={() => onCreate({ name: newName.trim(), baseUnit: newBase })}
        />
      </View>
    </Sheet>
  );
}

export type PurchaseFormValues = {
  ingredientId: string;
  supplier: { id: string } | { name: string };
  date: string;
  packSize: number;
  packUnit: Unit;
  quantity: number;
  amount: number;
};

export type PurchaseFormInitial = {
  ingredientId: string | null;
  supplierName: string;
  date: string;
  packSize: number | null;
  packUnit: Unit | null;
  quantity: number | null;
  amount: number | null;
};

type PurchaseFormProps = {
  initial: PurchaseFormInitial;
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: PurchaseFormValues) => void;
  /** Extra actions under the submit button (delete on the edit screen). */
  extraActions?: ReactNode;
  header: ReactNode;
  /** Shown above the form fields. */
  banner?: ReactNode;
};

export function PurchaseForm({ initial, submitLabel, saving, error, onSubmit, extraActions, header, banner }: PurchaseFormProps) {
  const ingredients = useIngredientOptions();
  const purchases = usePurchases();
  const createIngredient = useCreateIngredient();

  const [ingredientId, setIngredientId] = useState(initial.ingredientId);
  const [supplierName, setSupplierName] = useState(initial.supplierName);
  const [date, setDate] = useState(initial.date);
  const [packSize, setPackSize] = useState(initial.packSize === null ? '' : String(initial.packSize));
  const [packUnit, setPackUnit] = useState<Unit | null>(initial.packUnit);
  const [quantity, setQuantity] = useState(initial.quantity === null ? '' : String(initial.quantity));
  const [amount, setAmount] = useState(initial.amount);
  const [pickerOpen, setPickerOpen] = useState(false);

  const ingredient = ingredients.data?.ingredients.find((item) => item.id === ingredientId) ?? null;
  const suppliers = useMemo(() => {
    const byId = new Map<string, string>();
    for (const purchase of purchases.data?.purchases ?? []) byId.set(purchase.supplierId, purchase.supplierName);
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [purchases.data]);

  const sizeValue = parseNumber(packSize);
  const quantityValue = parseNumber(quantity);
  const price = livePrice(sizeValue, packUnit, quantityValue, amount, ingredient?.baseUnit ?? null);

  const trimmedSupplier = supplierName.trim();
  const blocker = !ingredientId
    ? '식재료를 골라 주세요'
    : trimmedSupplier === ''
      ? '구매처를 입력해 주세요'
      : !isIsoDate(date)
        ? '구매일을 2026-10-31 형식으로 입력해 주세요'
        : !sizeValue || sizeValue <= 0
          ? '포장 용량을 입력해 주세요'
          : !packUnit
            ? '포장 단위를 골라 주세요'
            : price.kind === 'mismatch'
              ? '단위가 재료 기준 단위와 달라요'
              : !quantityValue || quantityValue <= 0
                ? '수량을 입력해 주세요'
                : !amount
                  ? '금액을 입력해 주세요'
                  : null;

  function submit() {
    if (blocker || !ingredientId || !packUnit || !sizeValue || !quantityValue || !amount) return;
    const existing = suppliers.find((supplier) => supplier.name === trimmedSupplier);
    onSubmit({
      ingredientId,
      supplier: existing ? { id: existing.id } : { name: trimmedSupplier },
      date,
      packSize: sizeValue,
      packUnit,
      quantity: quantityValue,
      amount,
    });
  }

  return (
    <Screen
      actions={
        <>
          {blocker ? <Text style={styles.reason}>{blocker}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={submitLabel} onPress={submit} disabled={blocker !== null} loading={saving} />
          {extraActions}
        </>
      }
    >
      {header}
      {banner}

      <Card style={styles.form}>
        <View style={styles.field}>
          <Text style={typography.secondary}>식재료</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="식재료 선택"
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <Text style={ingredient ? typography.body : styles.placeholder} numberOfLines={1}>
              {ingredient ? ingredient.name : ingredients.isPending && ingredientId ? '불러오는 중' : '식재료를 골라 주세요'}
            </Text>
            {ingredient ? <Text style={typography.caption}>{`기준 ${unitLabel(ingredient.baseUnit)}`}</Text> : null}
          </Pressable>
        </View>

        <View style={styles.field}>
          <TextField label="구매처" value={supplierName} onChangeText={setSupplierName} placeholder="예: 목장직송" />
          {suppliers.length > 0 ? (
            <View style={styles.supplierChips}>
              {suppliers.map((supplier) => (
                <Pressable
                  key={supplier.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${supplier.name} 선택`}
                  onPress={() => setSupplierName(supplier.name)}
                  style={({ pressed }) => [
                    styles.supplierChip,
                    supplier.name === trimmedSupplier && styles.supplierChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.supplierChipText}>{supplier.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {trimmedSupplier !== '' && !suppliers.some((supplier) => supplier.name === trimmedSupplier) ? (
            <Text style={typography.caption}>처음 보는 구매처는 저장할 때 새로 등록돼요.</Text>
          ) : null}
        </View>

        <TextField
          label="구매일"
          value={date}
          onChangeText={setDate}
          placeholder="2026-10-31"
          error={date !== '' && !isIsoDate(date) ? '2026-10-31 형식으로 입력해 주세요' : undefined}
        />

        <View style={styles.field}>
          <TextField label="포장 용량" value={packSize} onChangeText={setPackSize} keyboardType="decimal-pad" placeholder="예: 1" align="right" />
          <SegmentedControl<UnitChoice> options={unitOptions} value={packUnit ?? 'none'} onChange={(value) => value !== 'none' && setPackUnit(value)} />
        </View>
        <TextField label="수량" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="예: 12" suffix="개" align="right" />
        <MoneyField label="금액" value={amount} onChangeValue={setAmount} placeholder="0" />

        <View style={styles.priceBox}>
          <Text style={typography.secondary}>환산 단가</Text>
          {price.kind === 'ok' && ingredient ? (
            <>
              <Text style={typography.rowAmount}>{formatUnitPrice(price.unitPricePerBase, ingredient.baseUnit)}</Text>
              {ingredient.latest && initial.ingredientId !== ingredientId ? (
                <Text style={[typography.caption, { color: deltaColor(priceDelta(price.unitPricePerBase, ingredient.latest.unitPricePerBase, ingredient.baseUnit).delta) }]}>
                  {priceDelta(price.unitPricePerBase, ingredient.latest.unitPricePerBase, ingredient.baseUnit).text}
                </Text>
              ) : null}
            </>
          ) : price.kind === 'mismatch' && ingredient ? (
            <Text style={styles.warnText}>{`단위가 재료 기준 단위와 달라요. 이 재료는 ${unitLabel(ingredient.baseUnit)} 단위로 계산해요.`}</Text>
          ) : (
            <Text style={typography.caption}>식재료, 포장 용량, 수량, 금액을 넣으면 계산돼요</Text>
          )}
        </View>
      </Card>

      <IngredientPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={ingredientId}
        onPick={(item) => {
          setIngredientId(item.id);
          setPickerOpen(false);
        }}
        creating={createIngredient.isPending}
        createError={createIngredient.error?.message ?? null}
        onCreate={(body) =>
          createIngredient.mutate(body, {
            onSuccess: ({ ingredient: created }) => {
              setIngredientId(created.id);
              setPickerOpen(false);
            },
          })
        }
      />
    </Screen>
  );
}

export default function NewPurchaseScreen() {
  const create = useCreatePurchase();
  return (
    <PurchaseForm
      header={<Header backLabel="구매 기록" title="직접 입력" />}
      initial={{ ingredientId: null, supplierName: '', date: todayIso(), packSize: null, packUnit: null, quantity: 1, amount: null }}
      submitLabel="저장"
      saving={create.isPending}
      error={create.error ? `저장하지 못했어요. ${create.error.message}` : null}
      onSubmit={({ supplier, ...values }) =>
        create.mutate(
          { ...values, ...('id' in supplier ? { supplierId: supplier.id } : { supplierName: supplier.name }) },
          { onSuccess: () => router.replace('/records') },
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: space.s4 },
  field: { gap: space.s2 },
  picker: {
    minHeight: control.inputHeight,
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s2,
  },
  placeholder: { ...typography.body, color: colors.text3 },
  pressed: { opacity: opacity.pressed },
  supplierChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  supplierChip: {
    minHeight: control.filterChipHeight,
    paddingHorizontal: space.s3,
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  supplierChipSelected: { backgroundColor: colors.primary50, borderColor: colors.primary },
  supplierChipText: typography.secondary,
  priceBox: { gap: space.s1, paddingTop: space.s3, borderTopWidth: lineWidth, borderTopColor: colors.line },
  warnText: { ...typography.caption, color: colors.warn },
  newBox: { gap: space.s3, paddingTop: space.s4, borderTopWidth: lineWidth, borderTopColor: colors.line },
  reason: { ...typography.caption, textAlign: 'center' },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
