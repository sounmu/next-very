import { formatUnitPrice, formatWon } from '@marginlog/core';
import type { CompareListItem } from '@marginlog/core/src/api/compare';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCompareList } from '@/api/compare';
import {
  Card,
  Chip,
  DemoNotice,
  Header,
  Notice,
  Screen,
  StateView,
  TextField,
  colors,
  iconSize,
  iconStroke,
  lineWidth,
  opacity,
  space,
  typography,
} from '@/ui';

function matches(item: CompareListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, spec, aliases } = item.ingredient;
  return [name, spec ?? '', ...aliases].some((text) => text.toLowerCase().includes(q));
}

function IngredientRow({ item, divider }: { item: CompareListItem; divider: boolean }) {
  const { ingredient, latestUnitPrice, offerCount, recommended } = item;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ingredient.name} 가격 비교 보기`}
      onPress={() => router.push({ pathname: '/compare/[ingredientId]', params: { ingredientId: ingredient.id } })}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <View style={styles.grow}>
            <Text style={typography.bodyStrong} numberOfLines={2}>
              {ingredient.name}
            </Text>
            <Text style={typography.caption}>
              {ingredient.spec ? `${ingredient.spec} · ` : ''}비교 상품 {offerCount}개
            </Text>
          </View>
          <View style={styles.side}>
            {latestUnitPrice === null ? (
              <Text style={styles.noPrice}>구매 기록 없음</Text>
            ) : (
              <Text style={typography.rowAmount}>{formatUnitPrice(latestUnitPrice, ingredient.baseUnit)}</Text>
            )}
            <Text style={typography.caption}>내 구매 단가</Text>
          </View>
        </View>
        {recommended ? (
          <Text style={styles.recommend} numberOfLines={2}>
            {recommended.supplierName} 추천 · 배송비 포함 {formatWon(recommended.total)}
          </Text>
        ) : (
          <Text style={typography.caption}>{offerCount === 0 ? '비교할 판매처 가격이 아직 없어요' : '추천할 상품이 없어요'}</Text>
        )}
      </View>
      <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
        <Path d="M9 5l7 7-7 7" stroke={colors.text2} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** 비교 tab (DESIGN.md 10.5): ingredients with my unit price and the recommended demo offer. */
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
        onAction={() => router.push('/records')}
      />
    );
  } else {
    const items = data.items.filter((item) => matches(item, query));
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
      <Header title="구매가 비교" right={<Chip label="데모" tone="demo" />} />
      <DemoNotice>공급처 상품과 가격은 데모 데이터예요</DemoNotice>
      <TextField label="재료 검색" value={query} onChangeText={setQuery} placeholder="예: 우유, 돼지고기" />
      {body}
      {!isPending && !isError && data.items.length > 0 ? (
        <Notice>같은 단위·규격 상품끼리 배송비 포함 총액으로 비교했어요</Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s4 },
  divider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  pressed: { opacity: opacity.pressed },
  rowMain: { flex: 1, minWidth: 0, gap: space.s2 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  grow: { flex: 1, minWidth: 0, gap: space.s1 },
  side: { alignItems: 'flex-end', gap: space.s1, flexShrink: 0 },
  noPrice: { ...typography.secondary, color: colors.text2 },
  recommend: { ...typography.secondary, color: colors.primary },
});
