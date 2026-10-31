import { formatDateKo, formatQty, formatUnitPrice, formatWon } from '@marginlog/core';
import type { PurchaseListItem } from '@marginlog/core/src/api/purchases';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useInvoices, usePurchases } from '@/api/records';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  Screen,
  SectionHeader,
  StateView,
  TextField,
  colors,
  control,
  opacity,
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
  const invoices = useInvoices();

  const pending = useMemo(
    () => invoices.data?.invoices.filter((invoice) => invoice.status === 'extracted') ?? [],
    [invoices.data],
  );

  const groups = useMemo(() => {
    const byDate = new Map<string, PurchaseListItem[]>();
    for (const purchase of purchases.data?.purchases ?? []) {
      byDate.set(purchase.date, [...(byDate.get(purchase.date) ?? []), purchase]);
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [purchases.data]);

  const filtered = q !== '';

  return (
    <Screen>
      <Header title="구매 기록" />

      <View style={styles.uploadActions}>
        <Button label="영수증 촬영·업로드" onPress={() => router.push('/records/upload')} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/purchases/new')}
          hitSlop={space.s2}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
        >
          <Text style={styles.textActionLabel}>직접 입력</Text>
        </Pressable>
      </View>

      {invoices.isError ? (
        <Card>
          <StateView
            kind="error"
            title="확인할 명세서를 불러오지 못했어요"
            message={invoices.error.message}
            actionLabel="다시 시도"
            onAction={() => invoices.refetch()}
          />
        </Card>
      ) : pending.length > 0 ? (
        <>
          <SectionHeader title="확인이 필요한 기록" />
          <Card style={styles.listCard}>
            {pending.map((invoice, index) => (
              <ListRow
                key={invoice.id}
                title={invoice.supplierName || invoice.extraction.supplier || '구매처 확인 필요'}
                subtitle={[invoice.date ? formatDateKo(invoice.date) : null, `${invoice.extraction.items.length}개 품목 · ${formatWon(invoice.extraction.total)}`]
                  .filter(Boolean)
                  .join(' · ')}
                value={
                  <View style={styles.chips}>
                    <Chip label="확인 필요" tone="warning" />
                  </View>
                }
                chevron
                divider={index < pending.length - 1}
                onPress={() => router.push({ pathname: '/records/[invoiceId]/review', params: { invoiceId: invoice.id } })}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="구매 내역" />
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
  );
}

const styles = StyleSheet.create({
  uploadActions: { gap: space.s1 },
  textAction: { alignSelf: 'center', minHeight: control.iconButton, justifyContent: 'center' },
  textActionLabel: { ...typography.secondary, color: colors.text, fontWeight: '600' },
  pressed: { opacity: opacity.pressed },
  listCard: { paddingVertical: 0 },
  chips: { flexDirection: 'row', gap: space.s1 },
  group: { gap: space.s2 },
});
