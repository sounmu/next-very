import { INDUSTRIES, formatStockQty, soldOn, type Industry, type StoreMenu, type StoreSale } from '@marginlog/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Chip,
  Header,
  ListRow,
  Notice,
  Screen,
  SectionHeader,
  TextButton,
  colors,
  control,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

import { MyPageButton } from './MyPageButton';
import { localToday, useSession } from './SessionProvider';

type Toast = { kind: 'sold'; sale: StoreSale; text: string } | { kind: 'problem'; text: string };

const TOAST_MS = 5000;

const counterOf = (industry: Industry) => (industry === 'cafe' ? '잔' : '인분');

export function StoreHome() {
  const { store, menus, stock, sales, welcomePending, dismissWelcome, sell, undoSale } = useSession();
  const [showWelcome, setShowWelcome] = useState(welcomePending);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!welcomePending) return;
    dismissWelcome().catch((error: unknown) => console.warn('[home] could not save that the welcome was shown', error));
  }, [welcomePending, dismissWelcome]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!store) return null;
  const industry = INDUSTRIES.find((item) => item.id === store.industry)?.name ?? '';
  const counter = counterOf(store.industry);
  const today = localToday();

  async function onSell(menu: StoreMenu) {
    try {
      const result = await sell(menu.id);
      setToast(result.ok ? { kind: 'sold', sale: result.sale, text: `${menu.name} 1${counter} 기록했어요` } : { kind: 'problem', text: result.message });
    } catch (error) {
      console.warn('[home] could not record the sale', error);
      setToast({ kind: 'problem', text: '기록하지 못했어요. 다시 시도해 주세요' });
    }
  }

  async function onUndo(sale: StoreSale) {
    setToast(null);
    try {
      await undoSale(sale.id);
    } catch (error) {
      console.warn('[home] could not undo the sale', error);
      setToast({ kind: 'problem', text: '취소하지 못했어요. 다시 시도해 주세요' });
    }
  }

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <Header
          title={store.name}
          subtitle={[`${store.sido} ${store.sigungu}`, industry].filter(Boolean).join(' · ')}
          right={<MyPageButton />}
        />

        {showWelcome ? (
          <Card variant="emphasis" style={styles.welcome}>
            <View style={styles.grow}>
              <Text style={typography.bodyStrong}>가게 설정이 완료됐어요</Text>
              <Text style={typography.secondary}>선택한 업종의 기본 레시피 3개를 준비했어요.</Text>
            </View>
            <TextButton label="닫기" onPress={() => setShowWelcome(false)} />
          </Card>
        ) : null}

        <SectionHeader title="우리 가게 메뉴" />
        <Card style={styles.list}>
          {menus.length === 0 ? (
            <Notice style={styles.empty}>등록된 메뉴가 없어요</Notice>
          ) : (
            menus.map((menu, index) => (
              <MenuSaleRow
                key={menu.id}
                menu={menu}
                soldText={`오늘 ${soldOn(sales, menu.id, today)}${counter} 판매 · 원가 계산 전`}
                divider={index < menus.length - 1}
                onSell={() => void onSell(menu)}
              />
            ))
          )}
        </Card>

        <SectionHeader title="재료 재고" />
        <Card style={styles.list}>
          <View style={styles.stockHead}>
            <Chip label="데모 재고" tone="info" />
            <Text style={typography.caption}>예시로 넣은 처음 재고예요</Text>
          </View>
          {stock.length === 0 ? (
            <Notice style={styles.empty}>재고로 관리할 재료가 없어요</Notice>
          ) : (
            stock.map((item, index) => (
              <ListRow
                key={item.name}
                title={item.name}
                value={formatStockQty(item.quantity, item.baseUnit, item.countLabel)}
                valueCaption={item.quantity === 0 ? '재고 없음' : `처음 ${formatStockQty(item.initial, item.baseUnit, item.countLabel)}`}
                divider={index < stock.length - 1}
              />
            ))
          )}
        </Card>

        <Notice align="center">판매하면 레시피 사용량만큼 재고에서 빼요 · 원가는 구매 기록을 연결한 뒤 계산해요</Notice>
      </Screen>

      {toast ? (
        <View style={[styles.toast, toast.kind === 'problem' && styles.toastProblem]} accessibilityLiveRegion="polite">
          <Text style={[styles.toastText, toast.kind === 'problem' && styles.toastProblemText]}>{toast.text}</Text>
          {toast.kind === 'sold' ? (
            <Pressable accessibilityRole="button" onPress={() => void onUndo(toast.sale)} hitSlop={space.s2} style={({ pressed }) => [styles.toastAction, pressed && styles.pressed]}>
              <Text style={styles.toastActionLabel}>실행 취소</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setToast(null)} hitSlop={space.s2} style={({ pressed }) => [styles.toastAction, pressed && styles.pressed]}>
              <Text style={styles.toastCloseLabel}>닫기</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function MenuSaleRow({ menu, soldText, divider, onSell }: { menu: StoreMenu; soldText: string; divider: boolean; onSell: () => void }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${menu.name} 레시피 보기`}
        onPress={() => router.push({ pathname: '/store-menu/[id]', params: { id: menu.id } })}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
      >
        <View style={styles.nameLine}>
          <Text style={[typography.bodyStrong, styles.shrink]} numberOfLines={1}>
            {menu.name}
          </Text>
          {menu.isExample && !menu.edited ? <Chip label="예시 레시피" tone="info" /> : null}
        </View>
        <Text style={typography.caption}>{soldText}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${menu.name} 판매 +1`}
        onPress={onSell}
        style={({ pressed }) => [styles.sell, pressed && styles.pressed]}
      >
        <Text style={styles.sellLabel}>판매 +1</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: control.fab + space.s10 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  grow: { flex: 1, minWidth: 0, gap: space.s1 },
  list: { paddingVertical: 0 },
  empty: { paddingVertical: space.s5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s3 },
  divider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  rowMain: { flex: 1, minWidth: 0, gap: space.s1 / 2, minHeight: control.iconButton, justifyContent: 'center' },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  shrink: { flexShrink: 1 },
  sell: {
    minHeight: control.iconButton,
    paddingHorizontal: space.s4,
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellLabel: { ...typography.secondary, color: colors.text, fontWeight: '700' },
  stockHead: { flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingTop: space.s4 },
  pressed: { opacity: opacity.pressed },
  toast: {
    position: 'absolute',
    left: space.s5,
    right: space.s5,
    bottom: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
    borderRadius: radius.md,
    backgroundColor: colors.action,
  },
  toastProblem: { backgroundColor: colors.accent50 },
  toastText: { ...typography.secondary, flex: 1, minWidth: 0, color: colors.surface },
  toastProblemText: { color: colors.warn, fontWeight: '700' },
  toastAction: { minHeight: control.iconButton, justifyContent: 'center' },
  toastActionLabel: { ...typography.secondary, color: colors.surface, fontWeight: '700', textDecorationLine: 'underline' },
  toastCloseLabel: { ...typography.secondary, color: colors.warn, fontWeight: '700' },
});
