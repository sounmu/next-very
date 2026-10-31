import { ratioPercent, type Ingredient, type MenuCostLine } from '@marginlog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { useMenuDetail } from '@/api/menu';
import {
  Button,
  Card,
  colors,
  control,
  fontSize,
  formatWon,
  Header,
  Money,
  Notice,
  opacity,
  Row,
  Screen,
  space,
  typography,
} from '@/ui';

type ChangedLine = MenuCostLine & { cost: number; previousCost: number; delta: number };

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '불러오지 못했어요';
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function fullName(ingredient: Ingredient | undefined, fallback: string): string {
  if (!ingredient) return fallback;
  return ingredient.spec ? `${ingredient.name} · ${ingredient.spec}` : ingredient.name;
}

function splitLines(lines: MenuCostLine[]): { changed: ChangedLine[]; unchanged: MenuCostLine[] } {
  const changed: ChangedLine[] = [];
  const unchanged: MenuCostLine[] = [];
  for (const line of lines) {
    if (line.cost !== null && line.previousCost !== null && line.cost !== line.previousCost) {
      changed.push({ ...line, cost: line.cost, previousCost: line.previousCost, delta: line.cost - line.previousCost });
    } else {
      unchanged.push(line);
    }
  }
  return { changed, unchanged };
}

export default function MenuCostScreen() {
  const { menuId } = useLocalSearchParams<{ menuId: string }>();
  const router = useRouter();
  const detail = useMenuDetail(menuId);
  const data = detail.data;

  let body;
  let action;
  if (detail.isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (detail.isError) {
    body = isNotFound(detail.error) ? (
      <Card>
        <Text style={typography.bodyStrong}>메뉴를 찾을 수 없어요</Text>
        <Notice style={styles.detail}>삭제되었거나 주소가 잘못되었어요.</Notice>
        <Button variant="secondary" label="메뉴 목록 보기" onPress={() => router.navigate('/')} style={styles.retry} />
      </Card>
    ) : (
      <Card>
        <Text style={typography.bodyStrong}>메뉴 원가를 불러오지 못했어요</Text>
        <Notice style={styles.detail}>{errorMessage(detail.error)}</Notice>
        <Button variant="secondary" label="다시 시도" onPress={() => void detail.refetch()} style={styles.retry} />
      </Card>
    );
  } else {
    const { menu, cost, ingredients, suppliers } = detail.data;
    const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
    const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
    const nameOf = (id: string) => ingredientById.get(id)?.name ?? id;
    const { changed, unchanged } = splitLines(cost.lines);
    const totalChange =
      cost.total !== null && cost.previousTotal !== null && cost.total !== cost.previousTotal
        ? cost.total - cost.previousTotal
        : null;
    const cause = changed.reduce<ChangedLine | null>(
      (best, line) => (best === null || Math.abs(line.delta) > Math.abs(best.delta) ? line : best),
      null,
    );
    const single = changed.length === 1 ? changed[0] : null;

    body = (
      <>
        <Card variant="highlight" title="현재 식재료 원가">
          {cost.total === null ? (
            <>
              <Text style={styles.missingTotal}>{`매입가 미등록 재료 ${cost.missing.length}개`}</Text>
              <Text style={styles.missingHint}>매입가가 없는 재료가 있어 전체 원가를 계산하지 않았어요.</Text>
            </>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={typography.display}>{formatWon(cost.total, { unit: '' })}</Text>
                <Text style={styles.heroUnit}>원</Text>
              </View>
              {cost.previousTotal !== null && totalChange !== null ? (
                <>
                  <Row
                    label={`이전 ${formatWon(cost.previousTotal)} 대비`}
                    value={<Money value={totalChange} signed style={styles.rowMoney} />}
                  />
                  <Row
                    label="원가율"
                    value={`${ratioPercent(cost.previousTotal, menu.price)}% → ${ratioPercent(cost.total, menu.price)}%`}
                    divider={false}
                  />
                </>
              ) : (
                <Row label="원가율" value={`${ratioPercent(cost.total, menu.price)}%`} divider={false} />
              )}
            </>
          )}
        </Card>

        <Text style={styles.sectionTitle}>재료별 원가 구성</Text>
        {changed.map((line) => (
          <Card key={line.ingredientId}>
            <Text style={typography.bodyStrong}>{fullName(ingredientById.get(line.ingredientId), line.ingredientId)}</Text>
            <Text style={styles.lineMeta}>
              {line.unitPrice === null
                ? `${line.grams}g`
                : `${line.grams}g / ${formatWon(line.unitPrice, { unit: '원·kg' })}`}
            </Text>
            <Row label="1인분 재료비" value={<Money value={line.cost} style={styles.rowMoney} />} />
            <Row
              label={`이전 ${formatWon(line.previousCost)} 대비`}
              value={<Money value={line.delta} signed style={styles.rowMoney} />}
            />
            <Row
              label="구매처"
              value={line.supplierId === null ? '구매처 미상' : (supplierName.get(line.supplierId) ?? line.supplierId)}
              divider={false}
            />
          </Card>
        ))}
        {unchanged.length > 0 ? (
          <Card title={changed.length > 0 ? '나머지 재료' : '전체 재료'}>
            {unchanged.map((line, index) => (
              <Row
                key={line.ingredientId}
                label={`${nameOf(line.ingredientId)} · ${line.grams}g`}
                value={line.cost === null ? <Text style={styles.missing}>매입가 미등록</Text> : <Money value={line.cost} style={styles.rowMoney} />}
                divider={index < unchanged.length - 1}
              />
            ))}
          </Card>
        ) : null}
        {single && totalChange !== null ? (
          <Text style={styles.summary}>
            {`${totalChange > 0 ? '원가 상승' : '원가 하락'} ${formatWon(Math.abs(totalChange))}은 모두 ${nameOf(single.ingredientId)}에서 발생`}
          </Text>
        ) : null}
      </>
    );

    if (cause) {
      const ingredientId = cause.ingredientId;
      action = (
        <Button
          label="원인 재료 자세히 보기"
          onPress={() => router.push({ pathname: '/ingredient/[ingredientId]', params: { ingredientId } })}
        />
      );
    }
  }

  return (
    <Screen actions={action}>
      <Header
        backLabel="메뉴 목록"
        title={data?.menu.name ?? '메뉴 원가 상세'}
        subtitle={data ? `판매가 ${formatWon(data.menu.price)} · 1인분 기준` : undefined}
        right={
          data ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/recipe/[menuId]', params: { menuId } })}
              hitSlop={space.s2}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>레시피 수정</Text>
            </Pressable>
          ) : null
        }
      />
      {body}
      <Notice align="center">식재료 원가 기준 · 인건비 등 제외</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.s8, alignItems: 'center' },
  pressed: { opacity: opacity.pressed },
  detail: { marginTop: space.s1 },
  retry: { marginTop: space.s4 },
  link: { minHeight: control.iconButton, minWidth: control.iconButton, justifyContent: 'center' },
  linkText: { ...typography.bodyStrong, color: colors.primary },
  hero: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.s1, marginBottom: space.s2 },
  heroUnit: { ...typography.detailTitle, fontSize: fontSize.detail, color: colors.text2 },
  rowMoney: { fontSize: fontSize.row, lineHeight: typography.rowAmount.lineHeight },
  missingTotal: { ...typography.heading, color: colors.warn },
  missingHint: { ...typography.caption, marginTop: space.s1 },
  /** Screen gap (s3) + s4 = s7 above a new section. */
  sectionTitle: { ...typography.sectionTitle, marginTop: space.s4 },
  lineMeta: { ...typography.caption, marginTop: space.s1, marginBottom: space.s1 },
  missing: { ...typography.bodyStrong, color: colors.warn },
  summary: { ...typography.bodyStrong, color: colors.text, paddingVertical: space.s2 },
});
