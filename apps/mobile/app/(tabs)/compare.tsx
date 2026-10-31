import { formatUnitPrice, formatWon } from '@marginlog/core';
import type { CompareListItem } from '@marginlog/core/src/api/compare';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useCompareList } from '@/api/compare';
import { Card, Header, ListRow, Notice, Screen, StateView, TextField, colors, typography } from '@/ui';

function matches(item: CompareListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, spec, aliases } = item.ingredient;
  return [name, spec ?? '', ...aliases].some((text) => text.toLowerCase().includes(q));
}

function IngredientRow({ item, divider }: { item: CompareListItem; divider: boolean }) {
  const { ingredient, latestUnitPrice, recommended } = item;
  return (
    <ListRow
      title={ingredient.name}
      subtitle={latestUnitPrice === null ? '구매 기록 없음' : `내 단가 ${formatUnitPrice(latestUnitPrice, ingredient.baseUnit)}`}
      value={recommended ? formatWon(recommended.total) : <Text style={styles.none}>비교 상품 없음</Text>}
      valueCaption={recommended ? `${recommended.supplierName} 추천` : undefined}
      chevron
      divider={divider}
      onPress={() => router.push({ pathname: '/compare/[ingredientId]', params: { ingredientId: ingredient.id } })}
    />
  );
}

/** 비교 tab (DESIGN.md 10.5): ingredients with a recommendation first, one row each. */
export default function CompareScreen() {
  const [query, setQuery] = useState('');
  const { data, isPending, isError, error, refetch } = useCompareList();

  let body;
  if (isPending) {
    body = <StateView kind="loading" title="비교할 재료를 불러오고 있어요" />;
  } else if (isError) {
    body = (
      <StateView kind="error" title="비교 목록을 불러오지 못했어요" message={error.message} actionLabel="다시 시도" onAction={() => void refetch()} />
    );
  } else if (data.items.length === 0) {
    body = (
      <StateView
        kind="empty"
        title="비교할 재료가 아직 없어요"
        message="구매 기록을 등록하면 재료별로 공급처 가격을 비교할 수 있어요"
        actionLabel="구매 기록 등록"
        onAction={() => router.navigate('/records')}
      />
    );
  } else {
    const items = data.items
      .filter((item) => matches(item, query))
      .sort((a, b) => Number(b.recommended !== null) - Number(a.recommended !== null));
    body =
      items.length === 0 ? (
        <StateView kind="empty" title={`'${query.trim()}'와 맞는 재료가 없어요`} message="재료 이름이나 별칭으로 찾아보세요" />
      ) : (
        <Card style={styles.list}>
          {items.map((item, index) => (
            <IngredientRow key={item.ingredient.id} item={item} divider={index < items.length - 1} />
          ))}
        </Card>
      );
  }

  return (
    <Screen>
      <Header title="구매가 비교" />
      <TextField label="재료 검색" value={query} onChangeText={setQuery} placeholder="예: 우유, 돼지고기" />
      {body}
      {!isPending && !isError && data.items.length > 0 ? (
        <Notice align="center">같은 단위·규격 상품끼리 배송비 포함 합계로 비교해요</Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0 },
  none: { ...typography.secondary, color: colors.text2 },
});
