import { formatDateKo, formatQty, formatUnitPrice, type Ingredient, type MenuCostLine, type Supplier } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { useDeleteMenu, useMenu } from '@/api/menus';
import {
  Button,
  Card,
  Header,
  Notice,
  Row,
  Screen,
  SectionHeader,
  Sheet,
  StateView,
  colors,
  control,
  formatWon,
  opacity,
  space,
  typography,
} from '@/ui';

function TextLink({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={space.s2}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={[styles.linkLabel, danger && styles.linkDanger]}>{label}</Text>
    </Pressable>
  );
}

function previousText(total: number, previous: number): string {
  const delta = total - previous;
  if (delta === 0) return `이전 ${formatWon(previous)}과 같음`;
  return `이전 ${formatWon(previous)}보다 ${formatWon(Math.abs(delta))} ${delta > 0 ? '높음' : '낮음'}`;
}

function CostLine({
  line,
  ingredient,
  supplier,
  last,
}: {
  line: MenuCostLine;
  ingredient: Ingredient | undefined;
  supplier: Supplier | undefined;
  last: boolean;
}) {
  const name = ingredient?.name ?? '알 수 없는 재료';
  const qty = formatQty(line.amount, line.unit);
  if (line.issue === 'unit-mismatch') {
    const base = ingredient ? formatQty(1, ingredient.baseUnit).replace(/^1/, '') : '';
    return (
      <Row
        label={name}
        hint={`${qty} · 기본 단위 ${base}`}
        value={<Text style={styles.warn}>단위 확인 필요</Text>}
        divider={!last}
      />
    );
  }
  if (line.issue === 'no-price' || line.unitPricePerBase === null || line.cost === null || !ingredient) {
    return <Row label={name} hint={qty} value={<Text style={styles.warn}>단가 등록 필요</Text>} divider={!last} />;
  }
  const source = [supplier?.name, line.priceDate ? `${formatDateKo(line.priceDate)} 구매` : null].filter(Boolean).join(' · ');
  return (
    <Row
      label={name}
      hint={`${qty} × ${formatUnitPrice(line.unitPricePerBase, ingredient.baseUnit)}${source ? `\n${source}` : ''}`}
      value={formatWon(line.cost)}
      divider={!last}
    />
  );
}

export default function MenuCostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMenu(id);
  const remove = useDeleteMenu(id ?? '');
  const [confirming, setConfirming] = useState(false);

  if (query.isPending) {
    return (
      <Screen>
        <Header backLabel="메뉴 원가" title="메뉴 원가 상세" />
        <StateView kind="loading" title="메뉴 원가를 계산하고 있어요" />
      </Screen>
    );
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen>
        <Header backLabel="메뉴 원가" title="메뉴 원가 상세" />
        {notFound ? (
          <StateView
            kind="empty"
            title="메뉴를 찾을 수 없어요"
            message="삭제되었거나 주소가 잘못되었어요"
            actionLabel="메뉴 목록으로"
            onAction={() => router.replace('/menus')}
          />
        ) : (
          <StateView
            kind="error"
            title="메뉴 원가를 불러오지 못했어요"
            message={query.error.message}
            actionLabel="다시 시도"
            onAction={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const { menu, cost, ingredients, suppliers } = query.data;
  const editRecipe = () => router.push({ pathname: '/recipe/[menuId]', params: { menuId: menu.id } });
  const hasIssues = cost.missing.length > 0 || cost.unitIssues.length > 0;

  return (
    <Screen>
      <Header
        backLabel="메뉴 원가"
        title={menu.name}
        subtitle={`판매가 ${formatWon(menu.price)} · ${menu.servingLabel} 기준`}
      />

      <Card variant="highlight">
        <Text style={typography.cardTitle}>{menu.servingLabel} 식재료비</Text>
        {cost.total !== null ? (
          <>
            <Text style={typography.display}>{formatWon(cost.total)}</Text>
            <Text style={styles.heroLine}>
              원가율 {cost.ratio === null ? '-' : `${Math.round(cost.ratio * 100)}%`} · 판매가 {formatWon(menu.price)}
            </Text>
            {cost.previousTotal !== null ? (
              <Text style={styles.heroLine}>{previousText(cost.total, cost.previousTotal)}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={typography.amountLg}>
              {cost.missing.length > 0 ? '일부 재료 단가 미등록' : '단위 확인 필요'}
            </Text>
            <Text style={styles.heroLine}>
              확인된 재료만 더한 부분 합계 {formatWon(cost.partialTotal)} · 원가율은 계산하지 않아요
            </Text>
          </>
        )}
        <Text style={styles.heroCaption}>최근 구매 단가 기준 · 인건비·임대료 제외 · 배송비 제외</Text>
      </Card>

      <SectionHeader title="재료별 식재료비" />
      <Card>
        {cost.lines.length === 0 ? (
          <Notice>레시피에 재료가 없어요</Notice>
        ) : (
          cost.lines.map((line, index) => (
            <CostLine
              key={line.ingredientId}
              line={line}
              ingredient={ingredients.find((item) => item.id === line.ingredientId)}
              supplier={suppliers.find((item) => item.id === line.supplierId)}
              last={index === cost.lines.length - 1 && !hasIssues}
            />
          ))
        )}
        {hasIssues ? (
          <Row
            label="부분 합계"
            hint="확인 필요 재료는 합계에서 뺐어요"
            value={formatWon(cost.partialTotal)}
            divider={false}
          />
        ) : null}
      </Card>
      {hasIssues ? <Notice>단가가 없거나 단위가 맞지 않는 재료를 고치면 식재료비를 계산해요.</Notice> : null}

      <View style={styles.links}>
        <TextLink label="레시피 수정" onPress={editRecipe} />
        <TextLink label="메뉴 삭제" onPress={() => setConfirming(true)} danger />
      </View>

      <Sheet
        visible={confirming}
        title="메뉴를 삭제할까요?"
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button
              label="삭제"
              loading={remove.isPending}
              onPress={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    setConfirming(false);
                    router.replace('/menus');
                  },
                })
              }
            />
            <Button label="취소" variant="secondary" onPress={() => setConfirming(false)} />
          </>
        }
      >
        <Text style={typography.body}>
          {menu.name}의 레시피와 원가 정보가 지워져요. 구매 기록은 그대로 남아요.
        </Text>
        {remove.isError ? <Text style={styles.error}>삭제하지 못했어요 · {remove.error.message}</Text> : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: control.iconButton, justifyContent: 'center' },
  linkLabel: { ...typography.secondary, color: colors.primary, fontWeight: '600' },
  linkDanger: { color: colors.loss },
  pressed: { opacity: opacity.pressed },
  heroLine: { ...typography.body, color: colors.text, marginTop: space.s1 },
  heroCaption: { ...typography.caption, color: colors.text, marginTop: space.s3 },
  warn: { ...typography.secondary, color: colors.warn, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s4 },
  error: { ...typography.caption, color: colors.loss },
});
