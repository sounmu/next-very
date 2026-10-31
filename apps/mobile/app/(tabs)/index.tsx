import type { DashboardResponse } from '@marginlog/core/src/api/dashboard';
import { formatDateKo } from '@marginlog/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, useResetDemo } from '@/api';
import { useCompareList } from '@/api/compare';
import { useDashboard } from '@/api/home';
import { useIngredients } from '@/api/ingredients';
import { useOrders } from '@/api/shop';
import {
  Button,
  Card,
  Header,
  ListRow,
  Notice,
  Screen,
  SectionHeader,
  StateView,
  colors,
  control,
  formatWon,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

type ResetState = 'idle' | 'confirm' | 'done';

type Task = { key: string; title: string; subtitle?: string; onPress: () => void };

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : '잠시 후 다시 시도해 주세요';
}

export default function HomeScreen() {
  const dashboard = useDashboard();
  const ingredients = useIngredients();
  const compare = useCompareList();
  const orders = useOrders();
  const reset = useResetDemo();
  const [resetState, setResetState] = useState<ResetState>('idle');

  const confirmReset = () =>
    reset.mutate(undefined, { onSuccess: () => setResetState('done') });

  const header = <Header title="우리 가게 원가" onTitleLongPress={() => setResetState('confirm')} />;

  const resetPill =
    resetState === 'idle' ? null : (
      <View style={styles.pill} accessibilityLiveRegion="polite">
        <Text style={styles.pillText}>
          {resetState === 'done'
            ? '시연 데이터를 처음 상태로 되돌렸어요'
            : reset.isError
              ? `되돌리지 못했어요. ${errorText(reset.error)}`
              : '시연 데이터를 처음 상태로 되돌릴까요?'}
        </Text>
        {resetState === 'confirm' ? (
          <PillAction label={reset.isPending ? '되돌리는 중…' : '되돌리기'} onPress={confirmReset} disabled={reset.isPending} />
        ) : null}
        <PillAction label={resetState === 'done' ? '닫기' : '취소'} onPress={() => setResetState('idle')} />
      </View>
    );

  if (dashboard.isPending) {
    return (
      <Screen>
        {header}
        {resetPill}
        <StateView kind="loading" title="원가를 불러오고 있어요" />
      </Screen>
    );
  }

  if (dashboard.isError && !dashboard.data) {
    return (
      <Screen>
        {header}
        {resetPill}
        <StateView
          kind="error"
          title="원가를 불러오지 못했어요"
          message={errorText(dashboard.error)}
          actionLabel="다시 시도"
          onAction={() => dashboard.refetch()}
        />
      </Screen>
    );
  }

  const data = dashboard.data;
  const names = new Map<string, string>();
  for (const item of ingredients.data?.ingredients ?? []) names.set(item.id, item.name);
  for (const change of data.priceChanges) names.set(change.ingredientId, change.name);

  const tasks: Task[] = [];
  const review = data.needsReview;
  const firstReview = review[0];
  if (firstReview) {
    tasks.push({
      key: 'review',
      title: `확인할 명세서 ${review.length}건`,
      subtitle: [firstReview.supplier, firstReview.date ? formatDateKo(firstReview.date) : null].filter(Boolean).join(' · '),
      onPress: () =>
        review.length === 1
          ? router.push({ pathname: '/records/[invoiceId]/review', params: { invoiceId: firstReview.invoiceId } })
          : router.navigate('/records'),
    });
  }
  const cause = data.alert?.ingredientIds[0];
  if (cause) {
    const offer = compare.data?.items.find((item) => item.ingredient.id === cause)?.recommended;
    tasks.push({
      key: 'compare',
      title: `${names.get(cause) ?? '재료'} 더 싸게 사기`,
      subtitle: offer ? `${offer.supplierName} · 배송비 포함 ${formatWon(offer.total)}` : '공급처 가격 비교',
      onPress: () => router.push({ pathname: '/compare/[ingredientId]', params: { ingredientId: cause } }),
    });
  }
  const placed = (orders.data?.orders ?? []).filter((order) => order.status === 'placed');
  const firstPlaced = placed[0];
  if (firstPlaced) {
    tasks.push({
      key: 'receive',
      title: `입고 확인 ${placed.length}건`,
      subtitle: `${firstPlaced.lines[0]?.name ?? '주문'} · ${formatWon(firstPlaced.total)}`,
      onPress: () => router.push({ pathname: '/shop/orders/[id]', params: { id: firstPlaced.id } }),
    });
  }

  return (
    <Screen>
      {header}
      {resetPill}
      {dashboard.isError ? (
        <Card variant="emphasis" style={styles.refreshFail}>
          <Text style={[typography.secondary, styles.flex]}>최신 원가로 갱신하지 못했어요</Text>
          <PillAction label="다시 시도" onPress={() => dashboard.refetch()} inverse />
        </Card>
      ) : null}

      {data.purchaseCount === 0 ? (
        <Card>
          <StateView
            kind="empty"
            title="첫 구매 기록을 등록해 주세요"
            message="영수증을 찍으면 재료 단가와 메뉴 원가가 계산돼요"
            actionLabel="영수증 등록"
            onAction={() => router.push('/records/upload')}
          />
        </Card>
      ) : (
        <HeroCard data={data} names={names} />
      )}

      {tasks.length > 0 ? (
        <>
          <SectionHeader title="지금 할 일" />
          <Card style={styles.list}>
            {tasks.map((task, index) => (
              <ListRow
                key={task.key}
                title={task.title}
                subtitle={task.subtitle}
                chevron
                divider={index < tasks.length - 1}
                onPress={task.onPress}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="메뉴별 식재료비" actionLabel="전체 보기" onAction={() => router.push('/menus')} />
      <Card style={styles.list}>
        {data.menus.length === 0 ? (
          <Notice style={styles.listNotice}>레시피를 등록하면 메뉴별 식재료비를 볼 수 있어요</Notice>
        ) : (
          data.menus.map(({ menu, cost }, index) => (
            <ListRow
              key={menu.id}
              title={menu.name}
              subtitle={`판매가 ${formatWon(menu.price)}`}
              value={
                cost.total === null ? (
                  <Text style={styles.warnText}>{cost.missing.length === 0 && cost.unitIssues.length > 0 ? '단위 확인 필요' : '단가 등록 필요'}</Text>
                ) : (
                  formatWon(cost.total)
                )
              }
              valueCaption={cost.ratio === null ? undefined : `원가율 ${Math.round(cost.ratio * 100)}%`}
              chevron
              divider={index < data.menus.length - 1}
              onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })}
            />
          ))
        )}
      </Card>

      <Card style={styles.list}>
        <ListRow title="재료별 구매 단가" chevron onPress={() => router.push('/ingredients')} />
      </Card>

      <Notice align="center">최근 확인된 구매 단가 기준 · 배송비 제외</Notice>
    </Screen>
  );
}

function HeroCard({ data, names }: { data: DashboardResponse; names: Map<string, string> }) {
  const alert = data.alert;
  const item = (alert && data.menus.find(({ menu }) => menu.id === alert.menuId)) || data.menus[0];
  if (!item) return null;
  const { menu, cost } = item;
  const rising = alert?.menuId === menu.id ? alert : null;
  const causes = rising ? rising.ingredientIds.map((id) => names.get(id) ?? id) : [];

  return (
    <Card variant="highlight" style={styles.hero}>
      <Text style={styles.heroLabel}>
        {menu.name} · {menu.servingLabel} 식재료비
      </Text>
      {cost.total === null ? (
        <Text style={typography.heading}>일부 재료 단가 미등록</Text>
      ) : (
        <Text style={typography.display}>{formatWon(cost.total)}</Text>
      )}
      <Text style={styles.heroBody}>
        {cost.total === null
          ? `계산된 부분 합계 ${formatWon(cost.partialTotal)}`
          : [cost.ratio === null ? null : `원가율 ${Math.round(cost.ratio * 100)}%`, rising ? `이전보다 ${formatWon(rising.delta)} 높음` : null]
              .filter(Boolean)
              .join(' · ') || '최근 구매 단가 기준'}
      </Text>
      {causes.length > 0 ? <Text style={styles.heroCaption}>{causes.join(', ')} 구매 단가가 올랐어요</Text> : null}
      <Button
        label="원가 보기"
        onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })}
        style={styles.heroButton}
      />
    </Card>
  );
}

function PillAction({ label, onPress, disabled, inverse }: { label: string; onPress: () => void; disabled?: boolean; inverse?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={space.s2}
      style={({ pressed }) => [styles.pillAction, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[typography.secondary, styles.pillActionText, inverse && styles.pillActionInverse]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.s3,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.full,
    backgroundColor: colors.action,
  },
  pillText: { ...typography.secondary, flex: 1, minWidth: 0, color: colors.surface },
  pillAction: { minHeight: control.chipHeight, justifyContent: 'center' },
  pillActionText: { color: colors.surface, fontWeight: '700' },
  pillActionInverse: { color: colors.primary },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  refreshFail: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s3 },
  hero: { gap: space.s1 },
  heroLabel: { ...typography.secondary, color: colors.text },
  heroBody: { ...typography.body, color: colors.text },
  heroCaption: { ...typography.caption, color: colors.text },
  heroButton: { marginTop: space.s4 },
  list: { paddingVertical: 0 },
  listNotice: { paddingVertical: space.s5 },
  warnText: { ...typography.secondary, color: colors.warn, fontWeight: '600' },
});
