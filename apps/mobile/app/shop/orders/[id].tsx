import { formatDateKo, formatWon, unitLabel } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { ORDER_STATUS_LABEL, localDate, useOrder, useReceiveOrder } from '@/api/shop';
import { Button, Card, Chip, Header, ListRow, Notice, Row, Screen, StateView, colors, space, typography } from '@/ui';

export default function OrderDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id);
  const receive = useReceiveOrder(id);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [alreadyReceived, setAlreadyReceived] = useState(false);

  const header = <Header backLabel="주문 내역" title="주문 상세" />;

  if (order.isPending) {
    return (
      <Screen>
        {header}
        <StateView kind="loading" title="주문을 불러오고 있어요" />
      </Screen>
    );
  }
  if (order.isError) {
    const missing = order.error instanceof ApiError && order.error.status === 404;
    return (
      <Screen>
        {header}
        {missing ? (
          <StateView kind="empty" title="주문을 찾을 수 없어요" actionLabel="주문 내역 보기" onAction={() => router.replace('/shop/orders')} />
        ) : (
          <StateView kind="error" title="주문을 불러오지 못했어요" message={order.error.message} actionLabel="다시 시도" onAction={() => void order.refetch()} />
        )}
      </Screen>
    );
  }

  const current = order.data.order;
  const received = current.status === 'received';

  const confirm = () => {
    if (receive.isPending || received) return;
    setAlreadyReceived(false);
    receive.mutate(undefined, {
      onSuccess: ({ purchases }) => setSavedCount(purchases.length),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setAlreadyReceived(true);
          void order.refetch();
        }
      },
    });
  };

  const receiveFailed = receive.isError && !alreadyReceived;

  return (
    <Screen
      actions={
        received ? undefined : (
          <>
            {receiveFailed ? <Text style={styles.error}>반영하지 못했어요. {receive.error?.message}</Text> : null}
            <Button label="입고 확인 (구매 기록에 반영)" onPress={confirm} loading={receive.isPending} disabled={receive.isPending} />
            <Notice align="center">상품 줄마다 구매 기록이 하나씩 생겨요</Notice>
          </>
        )
      }
    >
      {header}
      <View style={styles.statusRow}>
        <Chip label={ORDER_STATUS_LABEL[current.status]} tone={received ? 'info' : 'neutral'} />
        <Text style={typography.caption}>{formatDateKo(localDate(current.createdAt))} 주문</Text>
      </View>

      {savedCount !== null ? (
        <Card variant="emphasis" style={styles.result}>
          <Text style={typography.bodyStrong}>구매 기록 {savedCount}건에 반영했어요</Text>
          <Text style={typography.caption}>메뉴 원가가 새 구매 단가로 다시 계산돼요</Text>
          <Button variant="secondary" label="구매 기록 보기" onPress={() => router.navigate('/records')} />
        </Card>
      ) : null}
      {alreadyReceived ? (
        <Card variant="emphasis" style={styles.result}>
          <Text style={typography.bodyStrong}>이미 반영된 주문이에요</Text>
          <Text style={typography.caption}>구매 기록은 새로 만들지 않았어요</Text>
          <Button variant="secondary" label="구매 기록 보기" onPress={() => router.navigate('/records')} />
        </Card>
      ) : null}
      {received && current.receivedAt ? (
        <Text style={styles.received}>입고 완료 · {formatDateKo(localDate(current.receivedAt))}</Text>
      ) : null}

      <Card title="주문 상품">
        {current.lines.map((line, index) => (
          <ListRow
            key={line.id}
            title={line.name}
            subtitle={`${line.packSize}${unitLabel(line.packUnit)} × ${line.quantity}개 · 포장당 ${formatWon(line.price)}`}
            value={formatWon(line.amount)}
            divider={index < current.lines.length - 1}
          />
        ))}
      </Card>

      <Card variant="highlight">
        <Row label="상품 합계" value={formatWon(current.itemsTotal)} />
        <Row label="배송비" value={formatWon(current.shippingTotal)} />
        <View style={styles.totalRow}>
          <Text style={typography.bodyStrong}>총 금액</Text>
          <Text style={typography.amountLg}>{formatWon(current.total)}</Text>
        </View>
        <Text style={typography.caption}>구매 기록에는 배송비를 넣지 않아요</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s2 },
  result: { gap: space.s2 },
  received: { ...typography.bodyStrong, color: colors.primary },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3, paddingVertical: space.s3 },
  error: { ...typography.caption, color: colors.loss },
});
