import type { DashboardResponse } from '@marginlog/core/src/api/dashboard';
import { formatDateKo, formatUnitPrice } from '@marginlog/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, useResetDemo } from '@/api';
import { useDashboard } from '@/api/home';
import { useIngredients } from '@/api/ingredients';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  Notice,
  Screen,
  SectionHeader,
  StateView,
  colors,
  control,
  deltaColor,
  formatWon,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

type ResetState = 'idle' | 'confirm' | 'done';

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : '잠시 후 다시 시도해 주세요';
}

function percent(rate: number) {
  return `${(Math.abs(rate) * 100).toFixed(1)}%`;
}

export default function HomeScreen() {
  const dashboard = useDashboard();
  const ingredients = useIngredients();
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

      <HighlightCard data={data} names={names} />
      <SpendCard data={data} />

      <SectionHeader title="확인이 필요한 기록" />
      <Card>
        {data.needsReview.length === 0 ? (
          <Notice>확인을 기다리는 기록이 없어요</Notice>
        ) : (
          data.needsReview.map((item, index) => (
            <ListRow
              key={item.invoiceId}
              title={item.supplier || '구매처 확인 필요'}
              subtitle={`${item.date ? formatDateKo(item.date) : '날짜 확인 필요'} · 품목 ${item.itemCount}개`}
              value={
                <View style={styles.chips}>
                  {item.issueCount > 0 ? <Chip label={`확인 필요 ${item.issueCount}건`} tone="warning" /> : <Chip label="확인 대기" tone="info" />}
                </View>
              }
              chevron
              divider={index < data.needsReview.length - 1}
              onPress={() => router.push({ pathname: '/records/[invoiceId]/review', params: { invoiceId: item.invoiceId } })}
            />
          ))
        )}
      </Card>

      <SectionHeader title="메뉴별 원가율" actionLabel="전체 보기" onAction={() => router.push('/menus')} />
      <Card>
        {data.menus.length === 0 ? (
          <Notice>레시피를 등록하면 메뉴별 식재료비를 볼 수 있어요</Notice>
        ) : (
          data.menus.map(({ menu, cost }, index) => (
            <ListRow
              key={menu.id}
              title={menu.name}
              subtitle={`${menu.servingLabel} · 판매가 ${formatWon(menu.price)}`}
              value={
                cost.total === null ? (
                  <Text style={styles.warnText}>{cost.missing.length === 0 && cost.unitIssues.length > 0 ? '단위 확인 필요' : '단가 등록 필요'}</Text>
                ) : (
                  formatWon(cost.total)
                )
              }
              valueCaption={cost.ratio === null ? `부분 합계 ${formatWon(cost.partialTotal)}` : `원가율 ${Math.round(cost.ratio * 100)}%`}
              chevron
              divider={index < data.menus.length - 1}
              onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })}
            />
          ))
        )}
      </Card>

      <SectionHeader title="가격 변동" actionLabel="전체 보기" onAction={() => router.push('/ingredients')} />
      <Card>
        {data.priceChanges.length === 0 ? (
          <Notice>이전 구매와 비교할 단가가 아직 없어요</Notice>
        ) : (
          data.priceChanges.map((change, index) => (
            <ListRow
              key={change.ingredientId}
              title={change.name}
              subtitle={`${formatDateKo(change.currentDate)} 구매\n이전 ${formatUnitPrice(change.previousUnitPrice, change.baseUnit)}`}
              value={
                <View style={styles.side}>
                  <Text style={typography.rowAmount}>{formatUnitPrice(change.currentUnitPrice, change.baseUnit)}</Text>
                  <Text style={[typography.caption, styles.delta, { color: deltaColor(change.changeRate) }]}>
                    {change.changeRate === 0 ? '이전과 같음' : `이전보다 ${percent(change.changeRate)} ${change.changeRate > 0 ? '높음' : '낮음'}`}
                  </Text>
                </View>
              }
              chevron
              divider={index < data.priceChanges.length - 1}
              onPress={() => router.push({ pathname: '/ingredients/[id]', params: { id: change.ingredientId } })}
            />
          ))
        )}
      </Card>

      <Button variant="secondary" label="식재료 관리" onPress={() => router.push('/ingredients')} />
      <Notice align="center">식재료비만 계산해요 · 인건비, 임대료, 배송비 제외</Notice>
    </Screen>
  );
}

function HighlightCard({ data, names }: { data: DashboardResponse; names: Map<string, string> }) {
  const alert = data.alert;
  if (alert) {
    const causes = alert.ingredientIds.map((id) => names.get(id) ?? id);
    return (
      <Card variant="highlight" style={styles.highlight}>
        <Text style={styles.highlightLabel}>원가 상승 알림</Text>
        <Text style={typography.heading}>
          {alert.menuName} 메뉴당 식재료비가 {formatWon(alert.delta)} 올랐어요
        </Text>
        {causes.length > 0 ? <Text style={styles.highlightBody}>원인: {causes.join(', ')} 구매 단가가 올랐어요</Text> : null}
        <Button label="원인 보기" onPress={() => router.push({ pathname: '/menus/[id]', params: { id: alert.menuId } })} style={styles.highlightButton} />
      </Card>
    );
  }

  const first = data.menus[0];
  if (!first) return null;
  const { menu, cost } = first;
  return (
    <Card variant="highlight" style={styles.highlight}>
      <Text style={styles.highlightLabel}>
        {menu.name} · {menu.servingLabel} 식재료비
      </Text>
      {cost.total === null ? (
        <>
          <Text style={typography.heading}>일부 재료 단가 미등록</Text>
          <Text style={styles.highlightBody}>계산된 부분 합계 {formatWon(cost.partialTotal)}</Text>
        </>
      ) : (
        <Text style={typography.display}>{formatWon(cost.total)}</Text>
      )}
      <Text style={styles.highlightBody}>
        최근 구매 단가 기준{cost.ratio === null ? '' : ` · 원가율 ${Math.round(cost.ratio * 100)}%`}
      </Text>
      <Button label="원가 보기" onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })} style={styles.highlightButton} />
    </Card>
  );
}

function SpendCard({ data }: { data: DashboardResponse }) {
  const month = Number(data.month.split('-')[1]);
  if (data.purchaseCount === 0) {
    return (
      <Card>
        <StateView kind="empty" title="첫 구매 기록을 등록해 주세요" message="영수증을 찍으면 재료 단가와 메뉴 원가가 계산돼요" actionLabel="영수증 등록" onAction={() => router.push('/records/upload')} />
      </Card>
    );
  }
  return (
    <Card title={`${month}월 구매액`}>
      <View style={styles.spendRow}>
        <Text style={typography.amountLg}>{formatWon(data.monthSpend)}</Text>
        <Text style={typography.secondary}>확인된 구매 {data.purchaseCount}건</Text>
      </View>
      {data.monthIsCurrent ? null : <Notice style={styles.spendCaption}>이번 달 구매가 없어 최근 구매가 있는 달을 보여 줘요</Notice>}
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
  highlight: { gap: space.s2 },
  highlightLabel: { ...typography.secondary, color: colors.text },
  highlightBody: { ...typography.body, color: colors.text },
  highlightButton: { marginTop: space.s2 },
  spendRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s3, flexWrap: 'wrap' },
  spendCaption: { marginTop: space.s2 },
  chips: { flexDirection: 'row', gap: space.s1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  warnText: { ...typography.secondary, color: colors.warn, fontWeight: '600' },
  side: { alignItems: 'flex-end', gap: space.s1 },
  delta: { fontWeight: '600' },
});
