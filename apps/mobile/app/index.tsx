import { ratioPercent, type MenusResponse } from '@marginlog/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, useMenus, useResetDemo } from '@/api';
import { useIngredients } from '@/api/menu';
import {
  Button,
  Card,
  colors,
  control,
  fontSize,
  formatWon,
  Header,
  Money,
  Notice,
  opacity,
  radius,
  Row,
  Screen,
  space,
  typography,
} from '@/ui';

type MenuEntry = MenusResponse['menus'][number];
type Flash = { text: string; error: boolean; at: number };

const FLASH_MS = 2500;

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '불러오지 못했어요';
}

function costChange({ cost }: MenuEntry): number | null {
  if (cost.total === null || cost.previousTotal === null || cost.total === cost.previousTotal) return null;
  return cost.total - cost.previousTotal;
}

export default function MenuListScreen() {
  const router = useRouter();
  const menus = useMenus();
  const ingredients = useIngredients();
  const reset = useResetDemo();
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  const resetDemo = () => {
    reset.mutate(undefined, {
      onSuccess: () => setFlash({ text: '시연 데이터로 초기화했어요', error: false, at: Date.now() }),
      onError: (error) => setFlash({ text: `초기화하지 못했어요 · ${errorMessage(error)}`, error: true, at: Date.now() }),
    });
  };

  const openMenu = (menuId: string) => router.push({ pathname: '/menu/[menuId]', params: { menuId } });

  const ingredientName = new Map(ingredients.data?.ingredients.map((i) => [i.id, i.name]) ?? []);

  let body;
  if (menus.isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (menus.isError) {
    body = (
      <Card>
        <Text style={typography.bodyStrong}>메뉴를 불러오지 못했어요</Text>
        <Notice style={styles.errorDetail}>{errorMessage(menus.error)}</Notice>
        <Button variant="secondary" label="다시 시도" onPress={() => void menus.refetch()} style={styles.retry} />
      </Card>
    );
  } else if (menus.data.menus.length === 0) {
    body = (
      <Card>
        <Text style={typography.bodyStrong}>등록된 메뉴가 없어요</Text>
        <Notice style={styles.errorDetail}>아래 [메뉴·레시피 등록 / 수정]에서 첫 메뉴와 레시피를 등록해 주세요.</Notice>
      </Card>
    );
  } else {
    const { alert } = menus.data;
    const sorted = [...menus.data.menus].sort(
      (a, b) => Number(costChange(b) !== null) - Number(costChange(a) !== null),
    );
    const alertNames = alert?.ingredientIds.flatMap((id) => ingredientName.get(id) ?? []) ?? [];
    body = (
      <>
        {alert ? (
          <Card variant="emphasis">
            <Text style={typography.heading}>{`${alert.menuName} 원가가 ${formatWon(alert.delta)} 올랐어요`}</Text>
            <Text style={styles.alertBody}>
              {alertNames.length > 0 ? `${alertNames.join(', ')} 매입가격이 달라졌어요.` : '재료 매입가격이 달라졌어요.'}
            </Text>
            <Button label="오른 이유 보기" onPress={() => openMenu(alert.menuId)} style={styles.alertButton} />
          </Card>
        ) : null}
        {sorted.map((entry) => (
          <MenuCard key={entry.menu.id} entry={entry} onPress={() => openMenu(entry.menu.id)} />
        ))}
      </>
    );
  }

  const status = reset.isPending ? { text: '시연 데이터로 초기화하는 중', error: false } : flash;

  return (
    <Screen
      actions={
        <>
          <Button variant="secondary" label="메뉴·레시피 등록 / 수정" onPress={() => router.push('/recipe/new')} />
          <Button label="새 거래명세서 등록" onPress={() => router.push('/invoice/new')} />
        </>
      }
    >
      <Header title="우리 가게 메뉴" subtitle="최근 매입가격을 반영한 1인분 원가" onTitleLongPress={resetDemo} />
      {status ? (
        <Notice align="center" style={[styles.flash, status.error && styles.flashError]}>
          {status.text}
        </Notice>
      ) : null}
      {body}
      <Notice align="center">식재료 원가 기준 · 인건비 등 제외</Notice>
    </Screen>
  );
}

function MenuCard({ entry, onPress }: { entry: MenuEntry; onPress: () => void }) {
  const { menu, cost, hasPendingQuote } = entry;
  const change = costChange(entry);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card>
        <View style={styles.menuHead}>
          <Text style={typography.heading}>{menu.name}</Text>
          <Text style={typography.caption}>{`판매가 ${formatWon(menu.price)}`}</Text>
        </View>
        {cost.total === null ? (
          <Row
            label="식재료 원가"
            value={<Text style={styles.missing}>{`매입가 미등록 재료 ${cost.missing.length}개`}</Text>}
            divider={false}
          />
        ) : (
          <>
            <Row label="식재료 원가" value={<Money value={cost.total} />} />
            <Row label="원가율" value={`${ratioPercent(cost.total, menu.price)}%`} divider={change !== null} />
            {change !== null ? <Row label="이전 대비" value={<Money value={change} signed />} divider={false} /> : null}
          </>
        )}
        {hasPendingQuote ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>새 구매처 견적 등록됨 · 매입 전</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.s8, alignItems: 'center' },
  pressed: { opacity: opacity.pressed },
  flash: {
    ...typography.secondary,
    color: colors.primary,
    backgroundColor: colors.primary50,
    paddingVertical: space.s2,
    paddingHorizontal: space.s3,
    borderRadius: radius.sm,
  },
  flashError: { color: colors.loss, backgroundColor: colors.loss50 },
  errorDetail: { marginTop: space.s1 },
  retry: { marginTop: space.s4 },
  alertBody: { ...typography.body, color: colors.text2, marginTop: space.s1 },
  alertButton: { marginTop: space.s4 },
  menuHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s3 },
  missing: { ...typography.bodyStrong, color: colors.warn },
  chip: {
    alignSelf: 'flex-start',
    height: control.chipHeight,
    paddingHorizontal: space.s2,
    borderRadius: radius.full,
    backgroundColor: colors.accent50,
    justifyContent: 'center',
    marginTop: space.s3,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.warn },
});
