import { formatDateKo, formatQty, formatUnitPrice, formatWon } from '@marginlog/core';
import type { PurchaseListItem } from '@marginlog/core/src/api/purchases';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { usePurchases } from '@/api/records';
import {
  Card,
  Header,
  ListRow,
  Screen,
  StateView,
  TextField,
  colors,
  control,
  iconSize,
  iconStroke,
  radius,
  shadow,
  space,
  typography,
} from '@/ui';

function subtitleOf(purchase: PurchaseListItem): string {
  const base = `${formatQty(purchase.packSize, purchase.packUnit)} × ${purchase.quantity}개 · ${purchase.supplierName}`;
  return purchase.source === 'order' ? `${base} · 주문에서 반영` : base;
}

export default function RecordsScreen() {
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim());
  const purchases = usePurchases({ q: q || undefined });

  const groups = useMemo(() => {
    const byDate = new Map<string, PurchaseListItem[]>();
    for (const purchase of purchases.data?.purchases ?? []) {
      byDate.set(purchase.date, [...(byDate.get(purchase.date) ?? []), purchase]);
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [purchases.data]);

  const filtered = q !== '';

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <Header title="구매 기록" />

        <TextField label="검색" value={query} onChangeText={setQuery} placeholder="재료, 별칭, 구매처로 찾기" />

        {purchases.isPending ? (
          <Card>
            <StateView kind="loading" title="구매 기록을 불러오고 있어요" />
          </Card>
        ) : purchases.isError ? (
          <Card>
            <StateView
              kind="error"
              title="구매 기록을 불러오지 못했어요"
              message={purchases.error.message}
              actionLabel="다시 시도"
              onAction={() => purchases.refetch()}
            />
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            {filtered ? (
              <StateView
                kind="empty"
                title="조건에 맞는 기록이 없어요"
                message="검색어를 바꿔 보세요."
                actionLabel="전체 기록 보기"
                onAction={() => setQuery('')}
              />
            ) : (
              <StateView
                kind="empty"
                title="첫 구매 기록을 등록해 주세요"
                message="영수증을 올리면 재료 단가와 메뉴 원가가 계산돼요."
                actionLabel="영수증 촬영·업로드"
                onAction={() => router.push('/records/upload')}
              />
            )}
          </Card>
        ) : (
          groups.map(([date, items]) => (
            <View key={date} style={styles.group}>
              <Text style={typography.secondary}>{formatDateKo(date)}</Text>
              <Card style={styles.listCard}>
                {items.map((purchase, index) => (
                  <ListRow
                    key={purchase.id}
                    title={purchase.ingredientName}
                    subtitle={subtitleOf(purchase)}
                    value={formatWon(purchase.amount)}
                    valueCaption={
                      purchase.unitPricePerBase === null
                        ? '단위 확인 필요'
                        : formatUnitPrice(purchase.unitPricePerBase, purchase.baseUnit)
                    }
                    divider={index < items.length - 1}
                    onPress={() => router.push({ pathname: '/purchases/[id]', params: { id: purchase.id } })}
                  />
                ))}
              </Card>
            </View>
          ))
        )}
      </Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="영수증 등록"
        onPress={() => router.push('/records/upload')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={colors.surface} strokeWidth={iconStroke * 1.25} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: control.fab + space.s10 },
  fab: {
    position: 'absolute',
    right: space.s5,
    bottom: space.s5,
    width: control.fab,
    height: control.fab,
    borderRadius: radius.full,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
  fabPressed: { backgroundColor: colors.actionPressed },
  listCard: { paddingVertical: 0 },
  group: { gap: space.s2 },
});
