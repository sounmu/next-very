import type { MenuCostChange } from '@marginlog/core/src/api/invoice';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';

import { useMenus } from '@/api';
import { invoiceImageUrl, useConfirmResult, useInvoice } from '@/api/invoice';
import { Button, Card, Header, Money, Notice, Row, Screen, colors, fontSize, formatWon, space, typography } from '@/ui';

function monthDay(date: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[1]}/${match[2]}` : date;
}

function percent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

type PriceChange = { ingredientId: string; previous: number | null; next: number };

function changedPrices(change: MenuCostChange): PriceChange[] {
  return change.after.lines.flatMap((after) => {
    if (after.unitPrice === null) return [];
    const previous = change.before.lines.find((line) => line.ingredientId === after.ingredientId)?.unitPrice ?? null;
    return previous === after.unitPrice ? [] : [{ ingredientId: after.ingredientId, previous, next: after.unitPrice }];
  });
}

function ImageModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        {failed ? (
          <View style={styles.modalImage}>
            <Notice align="center" style={styles.modalError}>
              사진을 불러올 수 없어요
            </Notice>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.modalImage}
            resizeMode="contain"
            accessibilityLabel="반영한 거래명세서 사진"
            onError={() => setFailed(true)}
          />
        )}
        <Button label="닫기" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

export default function InvoiceDoneScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const resultQuery = useConfirmResult(invoiceId ?? '');
  const detailQuery = useInvoice(invoiceId);
  const menusQuery = useMenus();
  const [showImage, setShowImage] = useState(false);

  const result = resultQuery.data;
  const detail = detailQuery.data;

  const ingredientNames = new Map<string, string>();
  for (const entry of detail?.items ?? []) {
    if (entry.suggestedIngredientId !== null && entry.ingredientName !== null) {
      ingredientNames.set(entry.suggestedIngredientId, entry.ingredientName);
    }
  }
  const nameOf = (ingredientId: string) => ingredientNames.get(ingredientId) ?? ingredientId;

  const purchaseDate = result?.purchases[0]?.date ?? detail?.invoice.date ?? detail?.invoice.extraction.date;
  const supplierName = detail?.supplier.name || detail?.invoice.extraction.supplier;
  const subtitle = result
    ? `${[purchaseDate ? monthDay(purchaseDate) : null, supplierName || null].filter(Boolean).join(' ')} 매입 · 확인 후 반영`.trimStart()
    : undefined;
  const changedMenuIds = new Set(result?.changes.map((change) => change.menuId));

  function goToMenus() {
    router.dismissTo('/');
  }

  function registerAnother() {
    router.dismissTo('/');
    router.push('/invoice/new');
  }

  return (
    <Screen
      actions={
        result && invoiceId ? (
          <>
            <Button label="반영한 명세서 보기" variant="secondary" onPress={() => setShowImage(true)} />
            <Button label="메뉴 목록으로" onPress={goToMenus} />
            <Button label="새 거래명세서 등록" variant="secondary" onPress={registerAnother} />
            <Notice align="center">갱신된 식재료 원가 · 실제 순이익 아님</Notice>
          </>
        ) : (
          <Button label="메뉴 목록으로" onPress={goToMenus} />
        )
      }
    >
      <Header title="메뉴 원가가 갱신됐어요" subtitle={subtitle} />

      {!result || !invoiceId ? (
        <Card>
          <Notice align="center">결과를 불러올 수 없어요</Notice>
        </Card>
      ) : (
        <>
          <ImageModal uri={invoiceImageUrl(invoiceId)} visible={showImage} onClose={() => setShowImage(false)} />

          {result.changes.length === 0 ? (
            <Card>
              <Notice>이 매입으로 원가가 바뀐 메뉴가 없어요.</Notice>
            </Card>
          ) : null}

          {result.changes.map((change) => {
            const { before, after } = change;
            return (
              <Card key={change.menuId} variant="highlight">
                <Text style={styles.menuName}>{change.menuName}</Text>
                {after.total === null ? (
                  <Text style={styles.missing}>{`매입가 미등록 재료 ${after.missing.length}개 · 원가를 계산할 수 없어요`}</Text>
                ) : (
                  <View style={styles.bigRow}>
                    <Text style={typography.display}>{formatWon(after.total)}</Text>
                    <Text style={styles.perServing}>/ 1인분</Text>
                  </View>
                )}
                {before.total !== null && after.total !== null ? (
                  <>
                    <Row label="직전 원가 대비" value={<Money value={after.total - before.total} signed style={styles.deltaAmount} />} />
                    <Row label="원가율" value={`${percent(before.ratio)} → ${percent(after.ratio)}`} divider={false} />
                  </>
                ) : null}
                {changedPrices(change).map((price) => (
                  <Notice key={price.ingredientId} style={styles.priceNote}>
                    {`${nameOf(price.ingredientId)} 매입가 ${
                      price.previous === null ? '' : `${formatWon(price.previous, { unit: '' })} → `
                    }${formatWon(price.next, { unit: '원/kg' })}`}
                  </Notice>
                ))}
              </Card>
            );
          })}

          <Card>
            <Text style={styles.cardHeading}>갱신된 메뉴 목록</Text>
            {menusQuery.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : menusQuery.isError ? (
              <>
                <Notice style={styles.errorText}>{menusQuery.error.message}</Notice>
                <Button label="다시 시도" variant="secondary" onPress={() => menusQuery.refetch()} style={styles.cardAction} />
              </>
            ) : menusQuery.data.menus.length === 0 ? (
              <Notice align="center">등록된 메뉴가 없어요</Notice>
            ) : (
              menusQuery.data.menus.map(({ menu, cost }, index, all) => (
                <Row
                  key={menu.id}
                  label={menu.name}
                  bold={changedMenuIds.has(menu.id)}
                  value={
                    cost.total === null
                      ? `매입가 미등록 재료 ${cost.missing.length}개`
                      : `${formatWon(cost.total)} · ${percent(cost.ratio)}`
                  }
                  divider={index < all.length - 1}
                />
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.cardHeading}>이번에 확인된 것</Text>
            <Text style={styles.body}>
              새 매입가격이 레시피에 반영됐어요. 판매량·재고·배송비를 합산한 실제 절감액은 아직 계산하지 않았어요.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorText: { color: colors.loss },
  cardAction: { marginTop: space.s3 },
  deltaAmount: { fontSize: fontSize.row, lineHeight: typography.rowAmount.lineHeight },
  cardHeading: { ...typography.sectionTitle, marginBottom: space.s3 },
  menuName: { ...typography.sectionTitle, marginBottom: space.s2 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s2, marginBottom: space.s2 },
  perServing: { ...typography.detailTitle, fontSize: fontSize.detail, color: colors.text2 },
  missing: { ...typography.secondary, color: colors.warn, marginBottom: space.s2 },
  priceNote: { marginTop: space.s2, color: colors.text2 },
  body: { ...typography.body, color: colors.text2 },
  modal: {
    flex: 1,
    backgroundColor: colors.text,
    paddingHorizontal: space.s4,
    paddingVertical: space.s8,
    gap: space.s3,
  },
  modalImage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  modalError: { color: colors.surface },
});
