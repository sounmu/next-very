import { currentAndPrevious, priceHistory, type Purchase, type Supplier } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ApiError } from '@/api';
import { useIngredientDetail, useMarket } from '@/api/supplier';
import {
  Button,
  Card,
  Header,
  Notice,
  Row,
  Screen,
  colors,
  control,
  deltaColor,
  fontSize,
  formatWon,
  lineWidth,
  radius,
  space,
  typography,
} from '@/ui';

const BACK_LABEL = '원가 상세';
const FALLBACK_TITLE = '재료 가격 추세';
const FOOTER = '식재료 원가 기준 · 인건비 등 제외';
const WEEKS = 4;
const DAY_MS = 86_400_000;
const CHART_HEIGHT = space.s8 * 4;
const CHART_LABEL_WIDTH = space.s8 + space.s2;
const CHART_LABEL_HEIGHT = fontSize.xs + space.s1;

type Series = { key: string; label: string; color: string; values: number[] };

function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${month}/${day}`;
}

function supplierName(suppliers: readonly Supplier[], supplierId: string): string {
  return suppliers.find((s) => s.id === supplierId)?.name ?? '구매처 미상';
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return '재료를 찾을 수 없어요';
  return error instanceof Error ? error.message : '불러오지 못했어요';
}

/** Week k (k = 1..4) ends `(4 - k)` weeks before the latest purchase; its value = unit price in force then / week-1 price x 100. */
function mineIndexFromPurchases(ingredientId: string, purchases: readonly Purchase[]): number[] | null {
  const history = priceHistory(ingredientId, purchases);
  const latest = history.at(-1);
  if (!latest) return null;
  const anchor = Date.parse(latest.date);
  const prices = Array.from({ length: WEEKS }, (_, i) => {
    const weekEnd = anchor - (WEEKS - 1 - i) * 7 * DAY_MS;
    const inForce = history.filter((p) => Date.parse(p.date) <= weekEnd).at(-1) ?? history[0];
    return inForce.unitPrice;
  });
  const base = prices[0];
  return prices.map((p) => Math.round((p / base) * 100));
}

function indexText(values: number[]): string {
  return `${values[0]} → ${values[values.length - 1]}`;
}

function TrendChart({ series, labels }: { series: Series[]; labels: string[] }) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all, 100);
  const max = Math.max(...all, 100);
  const margin = Math.max((max - min) * 0.15, 1);
  const lo = min - margin;
  const hi = max + margin;
  const count = labels.length;

  const plotLeft = space.s8;
  const plotRight = space.s4;
  const plotTop = space.s3;
  const plotBottom = space.s6;
  const plotWidth = width - plotLeft - plotRight;
  const plotHeight = CHART_HEIGHT - plotTop - plotBottom;
  const x = (i: number) => plotLeft + (count > 1 ? (plotWidth * i) / (count - 1) : plotWidth / 2);
  const y = (v: number) => plotTop + plotHeight * (1 - (v - lo) / (hi - lo));

  return (
    <View onLayout={onLayout} style={styles.chartBox}>
      {width > 0 ? (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Line
              x1={plotLeft}
              x2={width - plotRight}
              y1={y(100)}
              y2={y(100)}
              stroke={colors.line}
              strokeWidth={lineWidth}
              strokeDasharray={[space.s1, space.s1]}
            />
            {series.map((s) => (
              <Polyline
                key={`line-${s.key}`}
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={lineWidth * 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {series.map((s) =>
              s.values.map((v, i) => (
                <Circle
                  key={`dot-${s.key}-${i}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={space.s1}
                  fill={colors.surface}
                  stroke={s.color}
                  strokeWidth={lineWidth * 2}
                />
              )),
            )}
          </Svg>
          <Text
            style={[
              styles.chartLabel,
              styles.chartRefLabel,
              { width: plotLeft - space.s2, top: y(100) - CHART_LABEL_HEIGHT / 2 },
            ]}
          >
            100
          </Text>
          {series.map((s) => {
            const last = s.values[s.values.length - 1];
            const above = last >= 100;
            return (
              <Text
                key={`end-${s.key}`}
                style={[
                  styles.chartLabel,
                  styles.chartEndLabel,
                  {
                    color: s.color,
                    left: x(s.values.length - 1) - CHART_LABEL_WIDTH / 2,
                    top: above ? y(last) - space.s2 - CHART_LABEL_HEIGHT : y(last) + space.s2,
                  },
                ]}
              >
                {last}
              </Text>
            );
          })}
          {labels.map((label, i) => (
            <Text
              key={`label-${i}`}
              style={[styles.chartLabel, { left: x(i) - CHART_LABEL_WIDTH / 2, top: CHART_HEIGHT - CHART_LABEL_HEIGHT }]}
            >
              {label}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

function Legend({ series, isExample, unavailable }: { series: Series[]; isExample: boolean; unavailable: boolean }) {
  return (
    <View style={styles.legend}>
      {series.map((s) => (
        <View key={s.key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: s.color }]} />
          <Text style={typography.caption}>{s.label}</Text>
        </View>
      ))}
      {unavailable ? (
        <View style={[styles.chip, styles.chipNeutral]}>
          <Text style={[styles.chipText, styles.chipTextNeutral]}>참고 시세 없음</Text>
        </View>
      ) : null}
      {isExample ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>예시</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function IngredientTrendScreen() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId?: string }>();
  const detail = useIngredientDetail(ingredientId);
  const market = useMarket(ingredientId);

  if (!ingredientId) {
    return (
      <Screen>
        <Header backLabel={BACK_LABEL} title={FALLBACK_TITLE} />
        <Card>
          <Notice align="center">재료를 찾을 수 없어요</Notice>
        </Card>
      </Screen>
    );
  }

  if (detail.isPending) {
    return (
      <Screen>
        <Header backLabel={BACK_LABEL} title={FALLBACK_TITLE} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (detail.isError) {
    return (
      <Screen>
        <Header backLabel={BACK_LABEL} title={FALLBACK_TITLE} />
        <Card>
          <Notice>{errorMessage(detail.error)}</Notice>
          <Button
            variant="secondary"
            label="다시 시도"
            loading={detail.isRefetching}
            onPress={() => detail.refetch()}
            style={styles.retry}
          />
        </Card>
      </Screen>
    );
  }

  const { ingredient, purchases, suppliers, latestBySupplier, quotes } = detail.data;
  const nameOf = (supplierId: string) => supplierName(suppliers, supplierId);
  const { current, previous } = currentAndPrevious(ingredient.id, purchases);
  const changePercent =
    current && previous && previous.unitPrice > 0
      ? ((current.unitPrice - previous.unitPrice) / previous.unitPrice) * 100
      : null;

  const marketData = market.data;
  const weeks = marketData?.available ? marketData.weeks : null;
  const mineValues = weeks ? weeks.map((w) => w.mine) : mineIndexFromPurchases(ingredient.id, purchases);
  const marketValues = weeks ? weeks.map((w) => w.market) : null;
  const labels = weeks ? weeks.map((w) => `${w.week}주`) : (mineValues ?? []).map((_, i) => `${i + 1}주`);
  const series: Series[] = [];
  if (mineValues) series.push({ key: 'mine', label: '내 매입가', color: colors.primary, values: mineValues });
  if (marketValues) series.push({ key: 'market', label: '시장 참고', color: colors.text3, values: marketValues });

  const rose = (values: number[] | null) => values !== null && values.length > 1 && values[values.length - 1] > values[0];
  const fell = (values: number[] | null) => values !== null && values.length > 1 && values[values.length - 1] < values[0];
  const showAdvice = rose(mineValues) && fell(marketValues);
  const marketUnavailable = marketData !== undefined && !marketData.available;

  const supplierRows = [
    ...latestBySupplier.map((entry) => ({
      key: `latest-${entry.supplierId}`,
      label: nameOf(entry.supplierId),
      hint: undefined as string | undefined,
      value: `${formatWon(entry.unitPrice, { unit: '원/kg' })} · ${shortDate(entry.date)}`,
    })),
    ...quotes.map((quote) => ({
      key: `quote-${quote.id}`,
      label: nameOf(quote.supplierId),
      hint: `${shortDate(quote.date)} 견적 · 매입 전`,
      value: `견적 ${formatWon(quote.unitPrice, { unit: '원/kg' })}`,
    })),
  ];

  return (
    <Screen
      actions={
        <Button
          label="다른 구매처 등록하기"
          onPress={() => router.push({ pathname: '/supplier/new', params: { ingredientId: ingredient.id } })}
        />
      }
    >
      <Header
        backLabel={BACK_LABEL}
        title={ingredient.name}
        subtitle={[ingredient.spec, '원/kg'].filter(Boolean).join(' · ')}
      />

      <Card variant="emphasis" title="내 실제 매입가">
        {current ? (
          <>
            <Text style={typography.display}>
              {formatWon(current.unitPrice)}
              <Text style={styles.displayUnit}> / kg</Text>
            </Text>
            {previous ? (
              <>
                <Row label="이전 매입가" value={formatWon(previous.unitPrice)} />
                <Row
                  label="최근 변화"
                  divider={false}
                  value={
                    changePercent === null ? undefined : (
                      <Text style={[styles.rowValue, { color: deltaColor(changePercent) }]}>
                        {`${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
                      </Text>
                    )
                  }
                />
              </>
            ) : null}
            <Notice style={styles.evidence}>
              {`근거: ${shortDate(current.date)} ${nameOf(current.supplierId)} 거래명세서`}
            </Notice>
          </>
        ) : (
          <Notice>확인된 매입 이력이 없어요</Notice>
        )}
      </Card>

      <Card title="내 매입가 · 시장 참고 추세">
        <Notice>최근 4주 · 각 계열의 첫 주 = 100</Notice>
        {market.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : market.isError ? (
          <>
            <Notice style={styles.evidence}>{`참고 시세를 불러오지 못했어요 · ${errorMessage(market.error)}`}</Notice>
            <Button
              variant="secondary"
              label="다시 시도"
              loading={market.isRefetching}
              onPress={() => market.refetch()}
              style={styles.retry}
            />
          </>
        ) : (
          <>
            <Legend series={series} isExample={marketData?.available === true && marketData.isExample} unavailable={marketUnavailable} />
            {series.length > 0 ? (
              <TrendChart series={series} labels={labels} />
            ) : (
              <Notice style={styles.evidence}>매입 이력이 없어 추세를 그릴 수 없어요</Notice>
            )}
            {mineValues ? <Row label="내 매입가 지수" value={indexText(mineValues)} divider={marketValues !== null || marketUnavailable} /> : null}
            {marketValues ? <Row label="시장 참고 지수" value={indexText(marketValues)} divider={false} /> : null}
            {marketUnavailable ? <Row label="시장 참고 지수" value="참고 시세 없음" divider={false} /> : null}
            {marketData?.available ? (
              <Notice style={styles.evidence}>
                {`${marketData.source} · 품목·등급·지역 확인${marketData.isExample ? ' · 예시' : ''}`}
              </Notice>
            ) : null}
          </>
        )}
      </Card>

      {showAdvice ? (
        <Card title="다음 발주 전에 확인해 보세요">
          <Text style={typography.body}>
            내 가격은 올랐지만 참고 시세는 내렸어요. 기존 거래처에 단가를 묻거나 다른 구매처에 견적을 받아 보세요.
          </Text>
        </Card>
      ) : null}

      <Card title="등록된 구매처">
        {supplierRows.length > 0 ? (
          supplierRows.map((row, i) => (
            <Row key={row.key} label={row.label} hint={row.hint} value={row.value} divider={i < supplierRows.length - 1} />
          ))
        ) : (
          <Notice>등록된 구매처가 없어요</Notice>
        )}
      </Card>

      <Notice>소매 시세는 납품 견적이 아닙니다. 배송·등급·구매량에 따라 가격이 다를 수 있어요.</Notice>
      <Notice align="center" style={styles.footer}>
        {FOOTER}
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.s8, alignItems: 'center' },
  retry: { marginTop: space.s3 },
  displayUnit: { fontSize: fontSize.h, fontWeight: '600', color: colors.text2 },
  evidence: { marginTop: space.s2 },
  rowValue: { ...typography.bodyStrong, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s3, marginTop: space.s3 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  legendDot: { width: space.s2, height: space.s2, borderRadius: radius.full },
  chip: {
    height: control.chipHeight,
    paddingHorizontal: space.s2,
    borderRadius: radius.full,
    backgroundColor: colors.accent50,
    justifyContent: 'center',
  },
  chipNeutral: { backgroundColor: colors.bg },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.warn },
  chipTextNeutral: { color: colors.text2 },
  chartBox: { marginTop: space.s2, height: CHART_HEIGHT },
  chartLabel: {
    position: 'absolute',
    width: CHART_LABEL_WIDTH,
    height: CHART_LABEL_HEIGHT,
    lineHeight: CHART_LABEL_HEIGHT,
    fontSize: fontSize.xs,
    color: colors.text3,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  chartRefLabel: { left: 0, textAlign: 'right' },
  chartEndLabel: { fontWeight: '700' },
  footer: { marginTop: space.s2 },
});
