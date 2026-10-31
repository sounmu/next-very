import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMenus } from '@/api/menus';
import { Button, Card, Chip, Header, Notice, Row, Screen, StateView, colors, formatWon, opacity, space, typography } from '@/ui';
import type { MenuWithCost } from '@marginlog/core/src/api/menus';

function addMenu() {
  router.push({ pathname: '/recipe/[menuId]', params: { menuId: 'new' } });
}

function MenuCard({ item }: { item: MenuWithCost }) {
  const { menu, cost } = item;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${menu.name} 메뉴 원가 상세`}
      onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.titleRow}>
          <Text style={[typography.heading, styles.name]} numberOfLines={2}>
            {menu.name}
          </Text>
          <Text style={typography.caption}>{menu.servingLabel} 기준</Text>
        </View>
        <Row label="판매가" value={formatWon(menu.price)} />
        <Row
          label="메뉴당 식재료비"
          value={cost.total === null ? <Text style={styles.empty}>계산 안 됨</Text> : formatWon(cost.total)}
        />
        <Row
          label="원가율"
          value={cost.ratio === null ? <Text style={styles.empty}>-</Text> : `${Math.round(cost.ratio * 100)}%`}
          divider={false}
        />
        {cost.total === null && cost.missing.length > 0 ? (
          <Text style={styles.warn}>일부 재료 단가 미등록 · 부분 합계 {formatWon(cost.partialTotal)}</Text>
        ) : null}
        {cost.unitIssues.length > 0 ? (
          <View style={styles.issue}>
            <Chip label="단위 확인 필요" tone="warning" />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function MenusScreen() {
  const query = useMenus();
  const menus = query.data?.menus ?? [];

  return (
    <Screen actions={menus.length > 0 ? <Button label="메뉴 추가" onPress={addMenu} /> : undefined}>
      <Header backLabel="홈" title="메뉴 원가" />
      {query.isPending ? (
        <StateView kind="loading" title="메뉴를 불러오고 있어요" />
      ) : query.isError ? (
        <StateView
          kind="error"
          title="메뉴를 불러오지 못했어요"
          message={query.error.message}
          actionLabel="다시 시도"
          onAction={() => void query.refetch()}
        />
      ) : menus.length === 0 ? (
        <StateView
          kind="empty"
          title="등록된 메뉴가 없어요"
          message="레시피를 등록하면 메뉴별 식재료비를 볼 수 있어요"
          actionLabel="메뉴 추가"
          onAction={addMenu}
        />
      ) : (
        <>
          {menus.map((item) => (
            <MenuCard key={item.menu.id} item={item} />
          ))}
          <Notice>최근 확인된 구매 단가 기준 · 인건비·임대료 제외 · 배송비 제외</Notice>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: opacity.pressed },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s2, marginBottom: space.s1 },
  name: { flexShrink: 1 },
  empty: { ...typography.secondary, color: colors.text3 },
  warn: { ...typography.caption, color: colors.warn, marginTop: space.s2 },
  issue: { marginTop: space.s2 },
});
