import { formatWon, unitLabel } from '@marginlog/core';
import type { CartEntry } from '@marginlog/core/src/api/shop';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCart, usePlaceOrder, useRemoveCartItem, useSetCartItem } from '@/api/shop';
import {
  Button,
  Card,
  Chip,
  DemoNotice,
  Header,
  Notice,
  Row,
  Screen,
  StateView,
  colors,
  control,
  iconSize,
  iconStroke,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  items: CartEntry[];
  itemsTotal: number;
  shippingFee: number;
  minOrderAmount: number;
};

function groupBySupplier(items: readonly CartEntry[]): SupplierGroup[] {
  const groups = new Map<string, SupplierGroup>();
  for (const item of items) {
    const { product } = item;
    const group = groups.get(product.supplierId) ?? {
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      items: [],
      itemsTotal: 0,
      shippingFee: 0,
      minOrderAmount: 0,
    };
    group.items.push(item);
    group.itemsTotal += product.price * item.quantity;
    group.shippingFee = Math.max(group.shippingFee, product.shippingFee);
    group.minOrderAmount = Math.max(group.minOrderAmount, product.minOrderAmount);
    groups.set(product.supplierId, group);
  }
  return [...groups.values()];
}

export default function CartScreen() {
  const cart = useCart();
  const placeOrder = usePlaceOrder();

  const header = <Header backLabel="장보기" title="장바구니" />;

  if (cart.isPending) {
    return (
      <Screen>
        {header}
        <StateView kind="loading" title="장바구니를 불러오고 있어요" />
      </Screen>
    );
  }
  if (cart.isError) {
    return (
      <Screen>
        {header}
        <StateView kind="error" title="장바구니를 불러오지 못했어요" message={cart.error.message} actionLabel="다시 시도" onAction={() => void cart.refetch()} />
      </Screen>
    );
  }

  const { items, preview } = cart.data;
  if (items.length === 0) {
    return (
      <Screen>
        {header}
        <StateView
          kind="empty"
          title="장바구니가 비어 있어요"
          message="장보기에서 데모 상품을 담아 보세요"
          actionLabel="장보기로 가기"
          onAction={() => router.navigate('/shop')}
        />
      </Screen>
    );
  }

  const groups = groupBySupplier(items);
  const order = () =>
    placeOrder.mutate(undefined, {
      onSuccess: ({ order: placed }) => router.replace({ pathname: '/shop/orders/[id]', params: { id: placed.id } }),
    });

  return (
    <Screen
      actions={
        <>
          {placeOrder.isError ? <Text style={styles.error}>주문하지 못했어요. {placeOrder.error.message}</Text> : null}
          <Button label="데모 주문하기" onPress={order} loading={placeOrder.isPending} />
          <Notice align="center">결제하지 않고 공급처에 보내지 않아요</Notice>
        </>
      }
    >
      {header}
      <DemoNotice>데모 주문 · 실제 결제 없음</DemoNotice>

      {groups.map((group) => (
        <Card key={group.supplierId} style={styles.group}>
          <View style={styles.groupHead}>
            <Text style={[typography.sectionTitle, styles.grow]} numberOfLines={1}>
              {group.supplierName}
            </Text>
            <Chip label="데모" tone="demo" />
          </View>
          {group.items.map((item, index) => (
            <CartLine key={item.productId} item={item} divider={index < group.items.length - 1} />
          ))}
          <View style={styles.groupFoot}>
            <Row label="상품 금액" value={formatWon(group.itemsTotal)} />
            <Row label="배송비" hint="공급처마다 한 번" value={group.shippingFee === 0 ? '무료' : formatWon(group.shippingFee)} divider={false} />
            {group.itemsTotal < group.minOrderAmount ? (
              <View style={styles.warnRow}>
                <Chip label="확인 필요" tone="warning" />
                <Text style={[typography.caption, styles.shrink]}>
                  최소 주문 {formatWon(group.minOrderAmount)}보다 {formatWon(group.minOrderAmount - group.itemsTotal)} 적어요
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      ))}

      <Card variant="highlight">
        <Row label="상품 합계" value={formatWon(preview.itemsTotal)} />
        <Row label="배송비" value={formatWon(preview.shippingTotal)} />
        <View style={styles.totalRow}>
          <Text style={typography.bodyStrong}>총 결제 예정 금액</Text>
          <Text style={typography.amountLg}>{formatWon(preview.total)}</Text>
        </View>
        <Text style={typography.caption}>데모 주문 · 실제 결제 없음</Text>
      </Card>
    </Screen>
  );
}

function CartLine({ item, divider }: { item: CartEntry; divider: boolean }) {
  const setItem = useSetCartItem();
  const removeItem = useRemoveCartItem();
  const busy = setItem.isPending || removeItem.isPending;
  const { product } = item;
  const failure = setItem.error ?? removeItem.error;

  return (
    <View style={[styles.line, divider && styles.divider]}>
      <View style={styles.lineHead}>
        <View style={styles.grow}>
          <Text style={typography.bodyStrong} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={typography.caption}>
            {product.packSize}
            {unitLabel(product.packUnit)} · 포장당 {formatWon(product.price)}
          </Text>
        </View>
        <Text style={typography.rowAmount}>{formatWon(product.price * item.quantity)}</Text>
      </View>
      <View style={styles.lineActions}>
        <View style={styles.stepper}>
          <StepButton
            kind="minus"
            label={`${product.name} 수량 줄이기`}
            disabled={busy || item.quantity <= 1}
            onPress={() => setItem.mutate({ productId: product.id, quantity: item.quantity - 1 })}
          />
          <Text style={styles.stepValue} accessibilityLabel={`수량 ${item.quantity}개`}>
            {item.quantity}
          </Text>
          <StepButton
            kind="plus"
            label={`${product.name} 수량 늘리기`}
            disabled={busy}
            onPress={() => setItem.mutate({ productId: product.id, quantity: item.quantity + 1 })}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${product.name} 빼기`}
          disabled={busy}
          onPress={() => removeItem.mutate(product.id)}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Text style={styles.removeLabel}>빼기</Text>
        </Pressable>
      </View>
      {failure ? <Text style={styles.error}>바꾸지 못했어요. {failure.message}</Text> : null}
    </View>
  );
}

function StepButton({ kind, label, disabled, onPress }: { kind: 'plus' | 'minus'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
        <Path d={kind === 'plus' ? 'M5 12h14M12 5v14' : 'M5 12h14'} stroke={colors.text} strokeWidth={iconStroke} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.s1 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  groupFoot: { borderTopWidth: lineWidth, borderTopColor: colors.line },
  grow: { flex: 1, minWidth: 0, gap: space.s1 },
  shrink: { flexShrink: 1 },
  line: { paddingVertical: space.s3, gap: space.s3 },
  divider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  lineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s1,
  },
  stepButton: { width: control.iconButton, height: control.iconButton, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  stepValue: { ...typography.rowAmount, minWidth: space.s8, textAlign: 'center' },
  remove: { minHeight: control.iconButton, minWidth: control.iconButton, paddingHorizontal: space.s3, justifyContent: 'center', alignItems: 'center' },
  removeLabel: { ...typography.secondary, color: colors.text2, textDecorationLine: 'underline' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingBottom: space.s2 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3, paddingVertical: space.s3 },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  error: { ...typography.caption, color: colors.loss },
});
