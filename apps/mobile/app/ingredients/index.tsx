import type { BaseUnit } from '@marginlog/core';
import { formatDateKo, formatUnitPrice, unitLabel } from '@marginlog/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ApiError } from '@/api';
import { useCreateIngredient, useIngredients, useSupplierNames } from '@/api/ingredients';
import {
  Button,
  Card,
  Header,
  ListRow,
  Notice,
  Screen,
  SegmentedControl,
  Sheet,
  StateView,
  TextField,
  colors,
  space,
  typography,
} from '@/ui';

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'mL', label: 'mL' },
  { value: 'ea', label: '개' },
] as const satisfies readonly { value: BaseUnit; label: string }[];

export default function IngredientsScreen() {
  const ingredients = useIngredients();
  const suppliers = useSupplierNames();
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const header = <Header backLabel="홈" title="식재료 관리" />;
  const addButton = <Button label="식재료 추가" onPress={() => setSheetOpen(true)} />;
  const sheet = <AddIngredientSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />;

  if (ingredients.isPending) {
    return (
      <Screen>
        {header}
        <StateView kind="loading" title="식재료를 불러오고 있어요" />
      </Screen>
    );
  }

  if (ingredients.isError && !ingredients.data) {
    return (
      <Screen>
        {header}
        <StateView
          kind="error"
          title="식재료를 불러오지 못했어요"
          message={ingredients.error instanceof ApiError ? ingredients.error.message : undefined}
          actionLabel="다시 시도"
          onAction={() => ingredients.refetch()}
        />
      </Screen>
    );
  }

  const all = ingredients.data.ingredients;
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? all.filter((item) => [item.name, item.spec ?? '', ...item.aliases].some((text) => text.toLowerCase().includes(needle)))
    : all;

  if (all.length === 0) {
    return (
      <Screen>
        {header}
        <StateView
          kind="empty"
          title="등록된 식재료가 없어요"
          message="식재료를 추가하거나 영수증을 등록하면 단가가 쌓여요"
          actionLabel="식재료 추가"
          onAction={() => setSheetOpen(true)}
        />
        {sheet}
      </Screen>
    );
  }

  return (
    <Screen actions={addButton}>
      {header}
      {ingredients.isError ? <Text style={styles.refreshFail}>목록을 갱신하지 못했어요. 이전에 받은 목록을 보여 줘요</Text> : null}
      <TextField label="검색" value={query} onChangeText={setQuery} placeholder="재료 이름, 규격, 표기" />
      <Notice>단가는 최근 확정 구매 기준이에요 · 식재료 {all.length}개</Notice>
      <Card style={styles.list}>
        {shown.length === 0 ? (
          <Notice style={styles.emptyLine}>‘{query.trim()}’에 맞는 식재료가 없어요</Notice>
        ) : (
          shown.map((item, index) => {
            const unitLine = [`기본 단위 ${unitLabel(item.baseUnit)}`, item.purchaseCount > 0 ? `구매 ${item.purchaseCount}건` : null]
              .filter(Boolean)
              .join(' · ');
            const meta = item.spec ? `${item.spec}\n${unitLine}` : unitLine;
            const latest = item.latest;
            const supplier = latest ? suppliers.data?.get(latest.supplierId) : undefined;
            return (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={meta}
                value={latest ? formatUnitPrice(latest.unitPricePerBase, item.baseUnit) : <Text style={styles.warn}>구매 기록 없음</Text>}
                valueCaption={latest ? `${formatDateKo(latest.date)}${supplier ? ` ${supplier}` : ''}` : '단가 등록 필요'}
                chevron
                divider={index < shown.length - 1}
                onPress={() => router.push({ pathname: '/ingredients/[id]', params: { id: item.id } })}
              />
            );
          })
        )}
      </Card>
      {sheet}
    </Screen>
  );
}

function AddIngredientSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateIngredient();
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [baseUnit, setBaseUnit] = useState<BaseUnit>('g');
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? '재료 이름을 입력해 주세요' : undefined;

  const close = () => {
    create.reset();
    setTouched(false);
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), baseUnit, ...(spec.trim() ? { spec: spec.trim() } : {}) },
      {
        onSuccess: ({ ingredient }) => {
          setName('');
          setSpec('');
          setBaseUnit('g');
          close();
          router.push({ pathname: '/ingredients/[id]', params: { id: ingredient.id } });
        },
      },
    );
  };

  return (
    <Sheet
      visible={visible}
      title="식재료 추가"
      onClose={close}
      actions={<Button label={create.isPending ? '저장 중…' : '추가하기'} onPress={submit} loading={create.isPending} />}
    >
      <TextField label="재료 이름" value={name} onChangeText={setName} placeholder="예: 돼지고기 앞다리" error={nameError} />
      <Text style={typography.secondary}>기본 단위</Text>
      <SegmentedControl options={UNIT_OPTIONS} value={baseUnit} onChange={setBaseUnit} />
      <Notice>g과 mL은 서로 바꾸지 않아요. 구매 기록이 생기면 기본 단위를 바꿀 수 없어요</Notice>
      <TextField label="규격 (선택)" value={spec} onChangeText={setSpec} placeholder="예: 국산 냉장" />
      {create.isError ? (
        <Text style={styles.error}>{create.error instanceof ApiError ? create.error.message : '저장하지 못했어요. 다시 시도해 주세요'}</Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space.s1 },
  emptyLine: { paddingVertical: space.s4 },
  warn: { ...typography.secondary, color: colors.warn, fontWeight: '600' },
  refreshFail: { ...typography.caption, color: colors.loss },
  error: { ...typography.caption, color: colors.loss },
});
