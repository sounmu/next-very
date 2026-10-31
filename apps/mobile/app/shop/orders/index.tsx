import { formatDateKo, formatWon } from '@marginlog/core';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ORDER_STATUS_LABEL, localDate, useOrders } from '@/api/shop';
import { Card, Chip, Header, ListRow, Screen, StateView, space, typography } from '@/ui';

export default function OrdersScreen() {
  const orders = useOrders();
  const header = <Header backLabel="구매" title="주문 내역" />;

  if (orders.isPending) {
    return (
      <Screen>
        {header}
        <StateView kind="loading" title="주문 내역을 불러오고 있어요" />
      </Screen>
    );
  }
  if (orders.isError) {
    return (
      <Screen>
        {header}
        <StateView kind="error" title="주문 내역을 불러오지 못했어요" message={orders.error.message} actionLabel="다시 시도" onAction={() => void orders.refetch()} />
      </Screen>
    );
  }

  const list = [...orders.data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen>
      {header}
      {list.length === 0 ? (
        <StateView
          kind="empty"
          title="아직 주문이 없어요"
          message="구매 탭에서 상품을 담고 주문을 넣어 보세요"
          actionLabel="상품 보러 가기"
          onAction={() => router.navigate('/shop')}
        />
      ) : (
        <Card style={styles.card}>
          {list.map((order, index) => {
            const first = order.lines[0]?.name ?? '상품 없음';
            const title = order.lines.length > 1 ? `${first} 외 ${order.lines.length - 1}건` : first;
            return (
              <View key={order.id}>
                <View style={styles.chips}>
                  <Chip label={ORDER_STATUS_LABEL[order.status]} tone={order.status === 'received' ? 'info' : 'neutral'} />
                </View>
                <ListRow
                  title={title}
                  subtitle={`${formatDateKo(localDate(order.createdAt))} 주문`}
                  value={formatWon(order.total)}
                  valueCaption="배송비 포함"
                  chevron
                  divider={index < list.length - 1}
                  onPress={() => router.push({ pathname: '/shop/orders/[id]', params: { id: order.id } })}
                />
              </View>
            );
          })}
        </Card>
      )}
      {list.length > 0 ? <Text style={typography.caption}>최근 주문이 위에 있어요</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space.s3 },
  chips: { flexDirection: 'row', gap: space.s2, paddingTop: space.s3 },
});
