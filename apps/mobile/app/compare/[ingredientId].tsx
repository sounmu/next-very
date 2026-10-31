import { formatDateKo, formatQty, formatUnitPrice, formatWon, unitLabel, type BaseUnit } from '@marginlog/core';
import type { CompareOffer } from '@marginlog/core/src/api/compare';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { useCartUpsert, useCompareDetail } from '@/api/compare';
import {
  Button,
  Card,
  Chip,
  Header,
  Notice,
  Row,
  Screen,
  SectionHeader,
  StateView,
  TextField,
  colors,
  control,
  space,
  typography,
} from '@/ui';

const REASON_LABEL = { unit: '단위가 달라요', spec: '규격이 달라요' } as const;
const NEED_DEBOUNCE_MS = 400;

function parseNeed(text: string): number | null {
  const value = Number(text.replace(/,/g, '').trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function productMeta(offer: CompareOffer): string {
  const { spec, origin, grade, packSize, packUnit } = offer.product;
  return [formatQty(packSize, packUnit), spec, origin, grade].filter(Boolean).join(' · ');
}

type OfferCardProps = {
  offer: CompareOffer;
  baseUnit: BaseUnit;
  recommended: boolean;
  added: boolean;
  adding: boolean;
  onAdd?: () => void;
};

function SupplierOfferCard({ offer, baseUnit, recommended, added, adding, onAdd }: OfferCardProps) {
  const { product } = offer;
  return (
    <Card variant={recommended ? 'emphasis' : 'default'} style={styles.offer}>
      <View style={styles.chips}>
        {recommended ? <Chip label="추천" tone="info" /> : null}
        {offer.comparable && !offer.meetsMinOrder ? (
          <Chip label={`최소 주문 ${formatWon(product.minOrderAmount)} 미만`} tone="warning" />
        ) : null}
        {offer.reason ? <Chip label={REASON_LABEL[offer.reason]} tone="neutral" /> : null}
      </View>
      <View style={styles.titles}>
        <Text style={typography.bodyStrong} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={typography.caption}>{productMeta(offer)}</Text>
        <Text style={typography.secondary}>{offer.supplierName}</Text>
      </View>
      {offer.comparable ? (
        <View>
          <Row label="상품가" hint={`${offer.packs}팩 × ${formatWon(product.price)}`} value={formatWon(offer.itemsTotal)} />
          <Row label="배송비" value={formatWon(offer.shippingFee)} />
          <Row
            label="최소 주문"
            value={product.minOrderAmount > 0 ? formatWon(product.minOrderAmount) : '없음'}
          />
          <Row label="배송비 포함 합계" bold value={formatWon(offer.total)} divider={false} />
          {offer.unitPricePerBase !== null ? (
            <Text style={typography.caption}>단가 {formatUnitPrice(offer.unitPricePerBase, baseUnit)}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.excluded}>
          <Text style={typography.secondary}>포장 가격 {formatWon(product.price)}</Text>
          <Text style={typography.caption}>
            {offer.reason === 'unit' ? '단위가 달라 비교하지 않았어요' : '규격이 달라 비교하지 않았어요'}
          </Text>
        </View>
      )}
      {onAdd ? (
        added ? (
          <View style={styles.added}>
            <Text style={styles.addedText}>장바구니에 담았어요</Text>
            <Link href="/shop/cart" style={styles.link}>
              장바구니 보기
            </Link>
          </View>
        ) : (
          <Button variant="secondary" label={`장바구니 담기 · ${offer.packs}팩`} loading={adding} onPress={onAdd} />
        )
      ) : null}
    </Card>
  );
}

/** Supplier comparison for one ingredient (PRODUCT.md 비교). Supplier catalog and prices are demo data. */
export default function CompareDetailScreen() {
  const { ingredientId = '' } = useLocalSearchParams<{ ingredientId: string }>();
  const [needText, setNeedText] = useState<string | null>(null);
  const [need, setNeed] = useState<number | undefined>(undefined);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(new Set());
  const { data, isPending, isError, error, refetch, isFetching } = useCompareDetail(ingredientId, need);
  const cart = useCartUpsert();

  useEffect(() => {
    if (needText === null) return;
    const parsed = parseNeed(needText);
    if (parsed === null) return;
    const timer = setTimeout(() => setNeed(parsed), NEED_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [needText]);

  if (isPending) {
    return (
      <Screen>
        <Header backLabel="구매가 비교" title="가격 비교 상세" />
        <StateView kind="loading" title="공급처 가격을 불러오고 있어요" />
      </Screen>
    );
  }
  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Screen>
        <Header backLabel="구매가 비교" title="가격 비교 상세" />
        {notFound ? (
          <StateView kind="empty" title="재료를 찾을 수 없어요" actionLabel="비교 목록으로" onAction={() => router.replace('/compare')} />
        ) : (
          <StateView kind="error" title="가격 비교를 불러오지 못했어요" message={error.message} actionLabel="다시 시도" onAction={() => void refetch()} />
        )}
      </Screen>
    );
  }

  const { ingredient, myLatest, offers, recommendedId, neededBaseQty } = data;
  const base = ingredient.baseUnit;
  const shownNeed = needText ?? String(neededBaseQty);
  const needError = needText !== null && parseNeed(needText) === null ? '0보다 큰 숫자를 입력해 주세요' : undefined;
  const comparable = offers.filter((offer) => offer.comparable);
  const excluded = offers.filter((offer) => !offer.comparable);
  const recommended = offers.find((offer) => offer.product.id === recommendedId) ?? null;
  const pendingId = cart.isPending ? cart.variables?.productId : undefined;

  const addToCart = (offer: CompareOffer) =>
    cart.mutate(
      { productId: offer.product.id, quantity: offer.packs },
      { onSuccess: () => setAddedIds((ids) => new Set(ids).add(offer.product.id)) },
    );

  const renderOffer = (offer: CompareOffer) => (
    <SupplierOfferCard
      key={offer.product.id}
      offer={offer}
      baseUnit={base}
      recommended={offer.product.id === recommendedId}
      added={addedIds.has(offer.product.id)}
      adding={pendingId === offer.product.id}
      onAdd={offer.comparable ? () => addToCart(offer) : undefined}
    />
  );

  return (
    <Screen>
      <Header
        backLabel="구매가 비교"
        title={ingredient.name}
        subtitle={[ingredient.spec, `기본 단위 ${unitLabel(base)}`].filter(Boolean).join(' · ')}
      />
      <TextField
        label="필요 수량"
        value={shownNeed}
        onChangeText={setNeedText}
        suffix={unitLabel(base)}
        keyboardType="decimal-pad"
        align="right"
        error={needError}
        hint={isFetching ? '다시 계산하고 있어요' : '기본값은 최근 구매량이에요'}
      />

      <Card title="내 최근 구매">
        {myLatest ? (
          <View style={styles.titles}>
            <Text style={typography.rowAmount}>{formatUnitPrice(myLatest.unitPricePerBase, base)}</Text>
            <Text style={typography.caption}>
              {formatDateKo(myLatest.date)} · {myLatest.supplierName}
            </Text>
          </View>
        ) : (
          <Text style={typography.body}>내 구매 기록이 아직 없어요</Text>
        )}
      </Card>

      {recommended ? (
        <Card variant="highlight">
          <Text style={styles.highlightLabel}>
            추천 · {recommended.supplierName}
          </Text>
          <Text style={typography.amountLg}>{formatWon(recommended.total)}</Text>
          <Text style={styles.highlightCaption}>
            배송비 포함 합계 · {formatQty(neededBaseQty, base)} 기준
          </Text>
        </Card>
      ) : null}

      {offers.length === 0 ? (
        <StateView kind="empty" title="비교할 판매처 가격이 아직 없어요" message="내 구매 기록만 볼 수 있어요" />
      ) : (
        <>
          <Notice>같은 단위·규격 상품끼리 배송비 포함 총액으로 비교했어요</Notice>
          {comparable.length > 0 ? (
            <>
              <SectionHeader title="공급처 상품" />
              {comparable.map(renderOffer)}
            </>
          ) : (
            <Card>
              <Text style={typography.body}>같은 단위·규격으로 비교할 상품이 없어요</Text>
            </Card>
          )}
          {comparable.length > 0 && !recommended ? (
            <Notice>최소 주문 금액을 채우는 상품이 없어 추천하지 않았어요</Notice>
          ) : null}
          {excluded.length > 0 ? (
            <>
              <SectionHeader title="비교 제외" />
              {excluded.map(renderOffer)}
            </>
          ) : null}
        </>
      )}
      {cart.isError ? <Text style={styles.error}>장바구니에 담지 못했어요: {cart.error.message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  offer: { gap: space.s3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  titles: { gap: space.s1 },
  excluded: { gap: space.s1 },
  added: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3, minHeight: control.secondaryButtonHeight },
  addedText: { ...typography.bodyStrong, color: colors.primary },
  link: { ...typography.secondary, color: colors.text, textDecorationLine: 'underline' },
  highlightLabel: { ...typography.cardTitle, color: colors.text },
  highlightCaption: { ...typography.caption, color: colors.text },
  error: { ...typography.caption, color: colors.loss },
});
