import { formatWon } from '@marginlog/core';
import type { MenuCost } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useConfirmResult } from '@/api/records';
import { Button, Card, Header, ListRow, Money, Screen, SectionHeader, StateView, colors, iconSize, iconStroke, radius, space, typography } from '@/ui';

function costText(cost: MenuCost): string {
  if (cost.total === null) return '확인 필요';
  return cost.ratio === null ? formatWon(cost.total) : `${formatWon(cost.total)} · ${Math.round(cost.ratio * 100)}%`;
}

export default function ReceiptDoneScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { data: result } = useConfirmResult(invoiceId);
  const header = <Header backLabel="구매 기록" title="저장 완료" onBack={() => router.replace('/records')} />;

  if (!result) {
    return (
      <Screen>
        {header}
        <Card>
          <StateView
            kind="empty"
            title="저장 결과를 다시 볼 수 없어요"
            message="저장한 기록은 구매 기록에서 확인할 수 있어요."
            actionLabel="기록으로"
            onAction={() => router.replace('/records')}
          />
        </Card>
      </Screen>
    );
  }

  const total = result.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const [first, ...rest] = result.changes;

  return (
    <Screen
      actions={
        <>
          <Button label="메뉴 원가 보기" onPress={() => router.replace('/menus')} />
          <Button label="기록으로" variant="secondary" onPress={() => router.replace('/records')} />
        </>
      }
    >
      {header}
      <View style={styles.hero}>
        <View style={styles.check}>
          <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.surface} strokeWidth={iconStroke * 1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={typography.heading}>구매 기록을 저장했어요</Text>
        <Text style={typography.secondary}>{`${result.purchases.length}개 품목 · 합계 ${formatWon(total)}`}</Text>
      </View>

      {first ? (
        <>
          <SectionHeader title="바뀐 메뉴 원가" />
          <Card variant="highlight">
            <Text style={styles.highlightLabel}>{first.menuName}</Text>
            <Text style={styles.highlightValue}>{costText(first.after)}</Text>
            <Text style={styles.highlightLabel}>{`이전 ${costText(first.before)}`}</Text>
            {first.before.total !== null && first.after.total !== null ? (
              <Money value={first.after.total - first.before.total} signed style={styles.highlightDelta} />
            ) : null}
          </Card>
          {rest.length > 0 ? (
            <Card style={styles.listCard}>
              {rest.map((change, index) => (
                <ListRow
                  key={change.menuId}
                  title={change.menuName}
                  subtitle={`이전 ${costText(change.before)}`}
                  value={costText(change.after)}
                  divider={index < rest.length - 1}
                />
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <Text style={typography.body}>메뉴 원가는 아직 그대로예요.</Text>
          <Text style={typography.caption}>새 재고는 지금 쓰는 재고를 다 쓴 뒤 원가에 반영돼요. 홈에서 정산하면 재고가 줄어요.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.s2, paddingVertical: space.s6 },
  check: {
    width: iconSize.lg * 2,
    height: iconSize.lg * 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightLabel: { ...typography.secondary, color: colors.text },
  highlightValue: { ...typography.amountLg, marginVertical: space.s1 },
  highlightDelta: { marginTop: space.s2, color: colors.text },
  listCard: { paddingVertical: space.s1 },
});
