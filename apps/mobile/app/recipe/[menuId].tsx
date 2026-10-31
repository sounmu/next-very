import { formatUnitPrice, toBase, unitLabel, type BaseUnit, type Menu, type Unit } from '@marginlog/core';
import type { IngredientListItem } from '@marginlog/core/src/api/ingredients';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { useMenu, useRecipeIngredients, useSaveMenu } from '@/api/menus';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  MoneyField,
  Notice,
  Screen,
  SegmentedControl,
  Sheet,
  StateView,
  TextField,
  colors,
  control,
  formatWon,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

const UNITS_BY_BASE: Record<BaseUnit, readonly Unit[]> = { g: ['g', 'kg'], mL: ['mL', 'L'], ea: ['ea'] };
const SERVING_PRESETS = ['1인분', '1잔', '1개'] as const;
type ServingChoice = (typeof SERVING_PRESETS)[number] | 'custom';
const SERVING_OPTIONS = [...SERVING_PRESETS.map((value) => ({ value, label: value })), { value: 'custom' as const, label: '직접' }];

type DraftLine = { key: string; ingredientId: string | null; amountText: string; unit: Unit | null };

let keySeq = 0;
const nextKey = () => `line-${++keySeq}`;
const emptyLine = (): DraftLine => ({ key: nextKey(), ingredientId: null, amountText: '', unit: null });

function parseAmount(text: string): number | null {
  const value = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

type LineState =
  | { kind: 'empty' }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'unit'; base: BaseUnit }
  | { kind: 'no-price'; ingredientId: string; amount: number; unit: Unit }
  | { kind: 'priced'; ingredientId: string; amount: number; unit: Unit; cost: number };

function evaluate(line: DraftLine, ingredient: IngredientListItem | undefined): LineState {
  const amount = parseAmount(line.amountText);
  if (line.ingredientId === null) {
    return line.amountText.trim() === '' ? { kind: 'empty' } : { kind: 'incomplete', reason: '재료를 선택해 주세요' };
  }
  if (!ingredient) return { kind: 'incomplete', reason: '재료 정보를 불러오고 있어요' };
  if (line.unit === null || !UNITS_BY_BASE[ingredient.baseUnit].includes(line.unit)) {
    return { kind: 'unit', base: ingredient.baseUnit };
  }
  if (amount === null) return { kind: 'incomplete', reason: `${ingredient.name} 사용량을 입력해 주세요` };
  const baseQty = toBase(amount, line.unit, ingredient.baseUnit);
  if (baseQty === null) return { kind: 'unit', base: ingredient.baseUnit };
  if (ingredient.latest === null) return { kind: 'no-price', ingredientId: ingredient.id, amount, unit: line.unit };
  return {
    kind: 'priced',
    ingredientId: ingredient.id,
    amount,
    unit: line.unit,
    cost: Math.round(baseQty * ingredient.latest.unitPricePerBase),
  };
}

function IngredientPicker({
  visible,
  onClose,
  onPick,
  usedIds,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ingredient: IngredientListItem) => void;
  usedIds: ReadonlySet<string>;
}) {
  const query = useRecipeIngredients();
  const [search, setSearch] = useState('');
  const term = search.trim();
  const list = (query.data?.ingredients ?? []).filter(
    (item) => term === '' || item.name.includes(term) || item.aliases.some((alias) => alias.includes(term)),
  );

  return (
    <Sheet visible={visible} title="재료 선택" onClose={onClose}>
      <TextField label="재료 검색" value={search} onChangeText={setSearch} placeholder="예: 우유" />
      {query.isPending ? (
        <StateView kind="loading" title="재료를 불러오고 있어요" />
      ) : query.isError ? (
        <StateView
          kind="error"
          title="재료를 불러오지 못했어요"
          message={query.error.message}
          actionLabel="다시 시도"
          onAction={() => void query.refetch()}
        />
      ) : query.data.ingredients.length === 0 ? (
        <StateView
          kind="empty"
          title="등록된 재료가 없어요"
          message="구매 기록을 등록하면 재료와 단가가 생겨요"
          actionLabel="식재료 관리로"
          onAction={() => {
            onClose();
            router.push('/ingredients');
          }}
        />
      ) : list.length === 0 ? (
        <Notice>“{term}”에 맞는 재료가 없어요</Notice>
      ) : (
        <View>
          {list.map((item, index) => {
            const used = usedIds.has(item.id);
            return (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={[item.spec, `기본 단위 ${unitLabel(item.baseUnit)}`, used ? '이미 추가함' : null].filter(Boolean).join(' · ')}
                value={
                  item.latest === null ? (
                    <Chip label="단가 없음" tone="warning" />
                  ) : (
                    <Text style={typography.secondary}>{formatUnitPrice(item.latest.unitPricePerBase, item.baseUnit)}</Text>
                  )
                }
                onPress={used ? undefined : () => onPick(item)}
                divider={index < list.length - 1}
              />
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

function LineEditor({
  index,
  line,
  ingredient,
  fallbackName,
  state,
  onPickIngredient,
  onChange,
  onRemove,
}: {
  index: number;
  line: DraftLine;
  ingredient: IngredientListItem | undefined;
  fallbackName: string | undefined;
  state: LineState;
  onPickIngredient: () => void;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}) {
  const name = ingredient?.name ?? fallbackName;
  const units = ingredient ? UNITS_BY_BASE[ingredient.baseUnit] : [];
  return (
    <Card>
      <View style={styles.lineHead}>
        <Text style={typography.cardTitle}>재료 {index + 1}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`재료 ${index + 1} 삭제`} onPress={onRemove} hitSlop={space.s2} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
          <Text style={styles.removeLabel}>삭제</Text>
        </Pressable>
      </View>
      <View style={styles.lineBody}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={name ? `재료 ${name}, 바꾸기` : '재료 선택'}
          onPress={onPickIngredient}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <Text style={[typography.body, !name && styles.placeholder]} numberOfLines={1}>
            {name ?? '재료 선택'}
          </Text>
          {ingredient?.latest === null ? <Chip label="단가 없음" tone="warning" /> : null}
        </Pressable>
        <TextField
          label="사용량"
          value={line.amountText}
          onChangeText={(amountText) => onChange({ amountText })}
          keyboardType="decimal-pad"
          placeholder="0"
          align="right"
          suffix={line.unit ? unitLabel(line.unit) : undefined}
        />
        {units.length > 0 ? (
          <SegmentedControl
            options={units.map((value) => ({ value, label: unitLabel(value) }))}
            value={line.unit ?? ('' as Unit)}
            onChange={(unit) => onChange({ unit })}
          />
        ) : null}
        <View style={styles.lineCost}>
          <Text style={typography.secondary}>재료비</Text>
          {state.kind === 'priced' ? (
            <Text style={typography.rowAmount}>{formatWon(state.cost)}</Text>
          ) : state.kind === 'no-price' ? (
            <Text style={styles.warn}>단가 등록 필요</Text>
          ) : state.kind === 'unit' ? (
            <Text style={styles.warn}>단위 확인 필요 · 기본 단위 {unitLabel(state.base)}</Text>
          ) : (
            <Text style={styles.muted}>-</Text>
          )}
        </View>
        {ingredient?.latest ? (
          <Notice>최근 구매 단가 {formatUnitPrice(ingredient.latest.unitPricePerBase, ingredient.baseUnit)}</Notice>
        ) : null}
      </View>
    </Card>
  );
}

function RecipeForm({ menuId, initial, knownNames }: { menuId: string; initial: Menu | null; knownNames: ReadonlyMap<string, string> }) {
  const ingredientsQuery = useRecipeIngredients();
  const save = useSaveMenu(menuId);
  const isNew = initial === null;

  const initialServing = initial?.servingLabel ?? '1인분';
  const presetServing = (SERVING_PRESETS as readonly string[]).includes(initialServing);
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState<number | null>(initial?.price ?? null);
  const [servingChoice, setServingChoice] = useState<ServingChoice>(presetServing ? (initialServing as ServingChoice) : 'custom');
  const [customServing, setCustomServing] = useState(presetServing ? '' : initialServing);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initial && initial.recipe.length > 0
      ? initial.recipe.map((line) => ({ key: nextKey(), ingredientId: line.ingredientId, amountText: String(line.amount), unit: line.unit }))
      : [emptyLine()],
  );
  const [pickingKey, setPickingKey] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map((ingredientsQuery.data?.ingredients ?? []).map((item) => [item.id, item] as const)),
    [ingredientsQuery.data],
  );
  const servingLabel = servingChoice === 'custom' ? customServing.trim() : servingChoice;
  const states = lines.map((line) => evaluate(line, line.ingredientId ? byId.get(line.ingredientId) : undefined));
  const filled = states.filter((state) => state.kind !== 'empty');
  const valid = filled.filter((state): state is Extract<LineState, { kind: 'priced' | 'no-price' }> => state.kind === 'priced' || state.kind === 'no-price');
  const partialTotal = valid.reduce((sum, state) => sum + (state.kind === 'priced' ? state.cost : 0), 0);
  const complete = valid.length > 0 && valid.length === filled.length && valid.every((state) => state.kind === 'priced');
  const usedIds = new Set(lines.flatMap((line) => (line.ingredientId ? [line.ingredientId] : [])));

  const firstBlocked = filled.find((state) => state.kind === 'incomplete' || state.kind === 'unit');
  const reason =
    name.trim() === ''
      ? '메뉴명을 입력해 주세요'
      : price === null || price <= 0
        ? '판매가를 입력해 주세요'
        : servingLabel === ''
          ? '제공 단위를 입력해 주세요'
          : valid.length === 0
            ? '재료를 하나 이상 추가해 주세요'
            : firstBlocked?.kind === 'incomplete'
              ? firstBlocked.reason
              : firstBlocked?.kind === 'unit'
                ? '단위 확인이 필요한 재료가 있어요'
                : null;

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const onSave = () => {
    if (reason !== null || price === null) return;
    save.mutate(
      {
        name: name.trim(),
        price,
        servingLabel,
        recipe: valid.map(({ ingredientId, amount, unit }) => ({ ingredientId, amount, unit })),
      },
      { onSuccess: ({ menu }) => router.replace({ pathname: '/menus/[id]', params: { id: menu.id } }) },
    );
  };

  const totalLabel = `${servingLabel || '메뉴당'} 식재료비`;

  return (
    <Screen
      actions={
        <>
          <View style={styles.totalRow}>
            <Text style={[typography.bodyStrong, styles.totalLabel]}>{totalLabel}</Text>
            {complete ? (
              <Text style={typography.amountLg}>{formatWon(partialTotal)}</Text>
            ) : valid.length > 0 ? (
              <View style={styles.totalSide}>
                <Text style={styles.warn}>
                  {filled.some((state) => state.kind === 'unit') ? '단위 확인 필요' : '일부 재료 단가 미등록'}
                </Text>
                <Text style={typography.caption}>부분 합계 {formatWon(partialTotal)}</Text>
              </View>
            ) : (
              <Text style={styles.muted}>-</Text>
            )}
          </View>
          {save.isError ? (
            <Text style={styles.error}>
              저장하지 못했어요 · {save.error instanceof ApiError ? save.error.message : '다시 시도해 주세요'}
            </Text>
          ) : reason ? (
            <Text style={styles.reason}>{reason}</Text>
          ) : null}
          <Button label="레시피 저장" onPress={onSave} disabled={reason !== null} loading={save.isPending} />
        </>
      }
    >
      <Header backLabel="메뉴 원가" title={isNew ? '레시피 등록' : '레시피 수정'} />
      <Card>
        <View style={styles.fields}>
          <TextField label="메뉴명" value={name} onChangeText={setName} placeholder="예: 카페라테" />
          <MoneyField label="판매가" value={price} onChangeValue={setPrice} placeholder="0" />
          <View style={styles.serving}>
            <Text style={typography.secondary}>제공 단위</Text>
            <SegmentedControl options={SERVING_OPTIONS} value={servingChoice} onChange={setServingChoice} />
            {servingChoice === 'custom' ? (
              <TextField label="제공 단위 직접 입력" value={customServing} onChangeText={setCustomServing} placeholder="예: 1접시" />
            ) : null}
          </View>
        </View>
      </Card>

      <Text accessibilityRole="header" style={typography.sectionTitle}>
        재료
      </Text>
      {ingredientsQuery.isError ? (
        <Notice style={styles.errorNotice}>재료 단가를 불러오지 못해 재료비를 계산할 수 없어요.</Notice>
      ) : null}
      {lines.map((line, index) => (
        <LineEditor
          key={line.key}
          index={index}
          line={line}
          ingredient={line.ingredientId ? byId.get(line.ingredientId) : undefined}
          fallbackName={line.ingredientId ? knownNames.get(line.ingredientId) : undefined}
          state={states[index] ?? { kind: 'empty' }}
          onPickIngredient={() => setPickingKey(line.key)}
          onChange={(patch) => updateLine(line.key, patch)}
          onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))}
        />
      ))}
      <Button label="재료 추가" variant="secondary" onPress={() => setLines((current) => [...current, emptyLine()])} />
      <Notice>최근 확인된 구매 단가 기준 · 인건비·임대료 제외 · 배송비 제외</Notice>

      <IngredientPicker
        visible={pickingKey !== null}
        onClose={() => setPickingKey(null)}
        usedIds={usedIds}
        onPick={(item) => {
          if (pickingKey) {
            const units = UNITS_BY_BASE[item.baseUnit];
            setLines((current) =>
              current.map((line) =>
                line.key === pickingKey
                  ? { ...line, ingredientId: item.id, unit: line.unit && units.includes(line.unit) ? line.unit : (units[0] ?? null) }
                  : line,
              ),
            );
          }
          setPickingKey(null);
        }}
      />
    </Screen>
  );
}

export default function RecipeEditScreen() {
  const { menuId = 'new' } = useLocalSearchParams<{ menuId: string }>();
  const isNew = menuId === 'new';
  const menuQuery = useMenu(isNew ? undefined : menuId);

  if (isNew) return <RecipeForm menuId="new" initial={null} knownNames={new Map()} />;

  if (menuQuery.isPending || menuQuery.isError) {
    const notFound = menuQuery.error instanceof ApiError && menuQuery.error.status === 404;
    return (
      <Screen>
        <Header backLabel="메뉴 원가" title="레시피 수정" />
        {menuQuery.isPending ? (
          <StateView kind="loading" title="레시피를 불러오고 있어요" />
        ) : notFound ? (
          <StateView kind="empty" title="메뉴를 찾을 수 없어요" actionLabel="새 메뉴 등록" onAction={() => router.replace({ pathname: '/recipe/[menuId]', params: { menuId: 'new' } })} />
        ) : (
          <StateView
            kind="error"
            title="레시피를 불러오지 못했어요"
            message={menuQuery.error?.message}
            actionLabel="다시 시도"
            onAction={() => void menuQuery.refetch()}
          />
        )}
      </Screen>
    );
  }

  const { menu, ingredients } = menuQuery.data;
  return (
    <RecipeForm
      key={menu.id}
      menuId={menu.id}
      initial={menu}
      knownNames={new Map(ingredients.map((item) => [item.id, item.name] as const))}
    />
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.s4 },
  serving: { gap: space.s2 },
  lineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineBody: { gap: space.s3 },
  textButton: { minHeight: control.iconButton, justifyContent: 'center' },
  removeLabel: { ...typography.secondary, color: colors.loss },
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
  placeholder: { color: colors.text3 },
  pressed: { opacity: opacity.pressed },
  lineCost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3 },
  warn: { ...typography.secondary, color: colors.warn, fontWeight: '600' },
  muted: { ...typography.secondary, color: colors.text3 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  totalLabel: { flex: 1 },
  totalSide: { alignItems: 'flex-end' },
  reason: { ...typography.caption, color: colors.text2 },
  error: { ...typography.caption, color: colors.loss },
  errorNotice: { color: colors.loss },
});
