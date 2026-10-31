import { formatUnitPrice, formatWon, unitLabel, type BaseUnit, type Unit } from '@marginlog/core';
import type { ShopProduct } from '@marginlog/core/src/api/shop';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCart, useOrders, useProducts, useSetCartItem, useShopIngredients } from '@/api/shop';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  Notice,
  Screen,
  StateView,
  TextField,
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

const ALL = 'all';

function baseOf(unit: Unit): BaseUnit {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'L' || unit === 'mL') return 'mL';
  return 'ea';
}

export default function ShopScreen() {
  const products = useProducts();
  const ingredients = useShopIngredients();
  const cart = useCart();
  const orders = useOrders();
  const [query, setQuery] = useState('');
  const [ingredientId, setIngredientId] = useState<string>(ALL);

  const ingredientById = useMemo(
    () => new Map((ingredients.data?.ingredients ?? []).map((ingredient, index) => [ingredient.id, { ...ingredient, index }])),
    [ingredients.data],
  );
  const nameOf = (id: string) => ingredientById.get(id)?.name ?? id;

  const sorted = useMemo(() => {
    const list = [...(products.data?.products ?? [])];
    const order = (id: string) => ingredientById.get(id)?.index ?? Number.MAX_SAFE_INTEGER;
    return list.sort(
      (a, b) =>
        order(a.ingredientId) - order(b.ingredientId) ||
        a.ingredientId.localeCompare(b.ingredientId) ||
        a.price + a.shippingFee - (b.price + b.shippingFee) ||
        a.id.localeCompare(b.id),
    );
  }, [products.data, ingredientById]);

  const filterIds = useMemo(() => [...new Set(sorted.map((product) => product.ingredientId))], [sorted]);

  const needle = query.trim().toLowerCase();
  const visible = sorted.filter((product) => {
    if (ingredientId !== ALL && product.ingredientId !== ingredientId) return false;
    if (!needle) return true;
    const ingredient = ingredientById.get(product.ingredientId);
    const haystack = [product.name, product.supplierName, product.spec, product.origin, ingredient?.name, ...(ingredient?.aliases ?? [])];
    return haystack.some((text) => text?.toLowerCase().includes(needle));
  });

  const cartQuantity = new Map((cart.data?.items ?? []).map((item) => [item.productId, item.quantity]));
  const cartCount = cart.data?.items.length ?? 0;
  const placed = (orders.data?.orders ?? []).filter((order) => order.status === 'placed');
  const firstPlaced = placed[0];

  return (
    <Screen>
      <Header
        title="구매"
        right={
          <View style={styles.headerActions}>
            <HeaderAction label={`장바구니 ${cartCount}`} onPress={() => router.push('/shop/cart')} />
          </View>
        }
      />
      {firstPlaced ? (
        <Card style={styles.list}>
          <ListRow
            title={`입고 확인 ${placed.length}건`}
            subtitle="받은 상품을 확인하면 구매 기록에 반영돼요"
            chevron
            onPress={() =>
              placed.length === 1
                ? router.push({ pathname: '/shop/orders/[id]', params: { id: firstPlaced.id } })
                : router.push('/shop/orders')
            }
          />
        </Card>
      ) : null}
      <TextField label="상품 검색" value={query} onChangeText={setQuery} placeholder="상품명, 재료, 공급처" />

      {products.isPending ? (
        <StateView kind="loading" title="상품을 불러오고 있어요" />
      ) : products.isError ? (
        <StateView
          kind="error"
          title="상품을 불러오지 못했어요"
          message={products.error.message}
          actionLabel="다시 시도"
          onAction={() => void products.refetch()}
        />
      ) : sorted.length === 0 ? (
        <StateView
          kind="empty"
          title="등록된 상품이 없어요"
          message="공급처 비교에서 재료별 구매가를 먼저 확인해 보세요"
          actionLabel="비교 보기"
          onAction={() => router.push('/compare')}
        />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <FilterChip label="전체" selected={ingredientId === ALL} onPress={() => setIngredientId(ALL)} />
            {filterIds.map((id) => (
              <FilterChip key={id} label={nameOf(id)} selected={ingredientId === id} onPress={() => setIngredientId(id)} />
            ))}
          </ScrollView>
          {visible.length === 0 ? (
            <StateView
              kind="empty"
              title="조건에 맞는 상품이 없어요"
              message="검색어를 지우거나 다른 재료를 골라 보세요"
              actionLabel="필터 초기화"
              onAction={() => {
                setQuery('');
                setIngredientId(ALL);
              }}
            />
          ) : (
            visible.map((product) => {
              const ingredient = ingredientById.get(product.ingredientId);
              const substitute = ingredient?.spec !== undefined && product.spec !== ingredient.spec;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  substitute={substitute}
                  inCart={cartQuantity.get(product.id) ?? 0}
                />
              );
            })
          )}
          <Card style={styles.list}>
            <ListRow title="주문 내역" chevron onPress={() => router.push('/shop/orders')} />
          </Card>
          <Notice align="center">재료별, 배송비 포함 1포장 합계 낮은 순</Notice>
        </>
      )}
    </Screen>
  );
}

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <Text style={styles.headerActionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: space.s1, bottom: space.s1 }}
      style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProductCard({ product, substitute, inCart }: { product: ShopProduct; substitute: boolean; inCart: number }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const setCartItem = useSetCartItem();
  const specLine = [product.spec, product.grade, product.origin].filter(Boolean).join(' · ');
  const pack = `${product.packSize}${unitLabel(product.packUnit)}`;

  const add = () => {
    setAdded(false);
    setCartItem.mutate(
      { productId: product.id, quantity: inCart + quantity },
      {
        onSuccess: () => {
          setAdded(true);
          setQuantity(1);
        },
      },
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[typography.bodyStrong, styles.grow]} numberOfLines={2}>
          {product.name}
        </Text>
      </View>
      {specLine || substitute ? (
        <View style={styles.specRow}>
          {specLine ? <Text style={[typography.caption, styles.shrink]}>{specLine}</Text> : null}
          {substitute ? <Chip label="대체 상품" tone="info" /> : null}
        </View>
      ) : null}
      <Text style={typography.secondary}>{product.supplierName}</Text>

      <View style={styles.priceRow}>
        <View style={styles.grow}>
          <Text style={typography.caption}>
            {pack}
            {product.unitPricePerBase !== null ? ` · ${formatUnitPrice(product.unitPricePerBase, baseOf(product.packUnit))}` : ''}
          </Text>
          <Text style={typography.caption}>
            배송비 {product.shippingFee === 0 ? '무료' : formatWon(product.shippingFee)}
            {product.minOrderAmount > 0 ? ` · 최소 주문 ${formatWon(product.minOrderAmount)}` : ''}
          </Text>
        </View>
        <View style={styles.priceSide}>
          <Text style={typography.rowAmount}>{formatWon(product.price)}</Text>
          {product.unitPricePerBase === null ? <Chip label="단위 확인 필요" tone="warning" /> : null}
        </View>
      </View>

      <View style={styles.buyRow}>
        <Stepper value={quantity} onChange={setQuantity} disabled={setCartItem.isPending} label={product.name} />
        <Button label="담기" onPress={add} loading={setCartItem.isPending} style={styles.addButton} />
      </View>
      {setCartItem.isError ? (
        <Text style={styles.error}>담지 못했어요. {setCartItem.error.message}</Text>
      ) : added || inCart > 0 ? (
        <Text style={styles.inCart}>장바구니에 {inCart}개 담겨 있어요</Text>
      ) : null}
    </Card>
  );
}

function Stepper({ value, onChange, disabled, label }: { value: number; onChange: (value: number) => void; disabled: boolean; label: string }) {
  return (
    <View style={styles.stepper}>
      <StepButton kind="minus" label={`${label} 수량 줄이기`} disabled={disabled || value <= 1} onPress={() => onChange(value - 1)} />
      <Text style={styles.stepValue} accessibilityLabel={`수량 ${value}개`}>
        {value}
      </Text>
      <StepButton kind="plus" label={`${label} 수량 늘리기`} disabled={disabled} onPress={() => onChange(value + 1)} />
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
  headerActions: { flexDirection: 'row', gap: space.s2, alignItems: 'center', minHeight: control.iconButton },
  headerAction: {
    minHeight: control.filterChipHeight,
    paddingHorizontal: space.s3,
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  headerActionLabel: { ...typography.secondary, color: colors.text },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  filters: { gap: space.s2, paddingVertical: space.s1 },
  filter: {
    minHeight: control.filterChipHeight,
    paddingHorizontal: space.s4,
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  filterSelected: { backgroundColor: colors.primary50, borderColor: colors.primary50 },
  filterLabel: { ...typography.secondary, color: colors.text2 },
  filterLabelSelected: { color: colors.text, fontWeight: '700' },
  card: { gap: space.s2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s2 },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  specRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s2 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.s3,
    marginTop: space.s1,
    paddingTop: space.s3,
    borderTopWidth: lineWidth,
    borderTopColor: colors.line,
  },
  priceSide: { alignItems: 'flex-end', gap: space.s1 },
  list: { paddingVertical: 0 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3, marginTop: space.s2 },
  addButton: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    height: control.buttonHeight,
    paddingHorizontal: space.s1,
  },
  stepButton: { width: control.iconButton, height: control.iconButton, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  stepValue: { ...typography.rowAmount, minWidth: space.s8, textAlign: 'center' },
  inCart: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  error: { ...typography.caption, color: colors.loss },
});
