import type { IngredientHistoryItem } from '@marginlog/core/src/api/ingredients';
import type { BaseUnit, Ingredient } from '@marginlog/core';
import { formatDateKo, formatQty, formatUnitPrice, unitLabel } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { ApiError } from '@/api';
import { useAddAlias, useIngredient, useUpdateIngredient } from '@/api/ingredients';
import {
  Button,
  Card,
  Chip,
  Header,
  ListRow,
  Notice,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  StateView,
  TextField,
  colors,
  fontSize,
  formatWon,
  lineWidth,
  radius,
  space,
  typography,
} from '@/ui';

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'mL', label: 'mL' },
  { value: 'ea', label: '개' },
] as const satisfies readonly { value: BaseUnit; label: string }[];

function messageOf(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function IngredientDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const detail = useIngredient(id);
  const [editOpen, setEditOpen] = useState(false);

  if (detail.isPending) {
    return (
      <Screen>
        <Header backLabel="식재료" title="식재료 상세" />
        <StateView kind="loading" title="식재료를 불러오고 있어요" />
      </Screen>
    );
  }

  if (detail.isError && !detail.data) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <Screen>
        <Header backLabel="식재료" title="식재료 상세" />
        <StateView
          kind="error"
          title={notFound ? '식재료를 찾을 수 없어요' : '식재료를 불러오지 못했어요'}
          message={messageOf(detail.error, '잠시 후 다시 시도해 주세요')}
          actionLabel={notFound ? '식재료 목록' : '다시 시도'}
          onAction={notFound ? () => router.replace('/ingredients') : () => detail.refetch()}
        />
      </Screen>
    );
  }

  const { ingredient, history, menus } = detail.data;
  const sorted = [...history].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  const latest = sorted.find((item) => item.unitPricePerBase !== null);

  return (
    <Screen>
      <Header
        backLabel="식재료"
        title={ingredient.name}
        subtitle={[ingredient.spec, `기본 단위 ${unitLabel(ingredient.baseUnit)}`].filter(Boolean).join(' · ')}
        right={<Button variant="secondary" label="수정" onPress={() => setEditOpen(true)} style={styles.editButton} />}
      />
      {detail.isError ? <Text style={styles.errorText}>최신 정보로 갱신하지 못했어요. 이전에 받은 내용을 보여 줘요</Text> : null}

      <Card variant="highlight" style={styles.highlight}>
        <Text style={styles.highlightLabel}>최근 구매 단가</Text>
        {latest && latest.unitPricePerBase !== null ? (
          <>
            <Text style={typography.display}>{formatUnitPrice(latest.unitPricePerBase, ingredient.baseUnit)}</Text>
            <Text style={styles.highlightBody}>
              {formatDateKo(latest.date)} {latest.supplierName} 구매 · 최근 확정 구매 기준
            </Text>
          </>
        ) : (
          <>
            <Text style={typography.heading}>단가 등록 필요</Text>
            <Text style={styles.highlightBody}>
              {history.length > 0 ? '구매 단위가 기본 단위와 맞지 않아 단가를 계산하지 않았어요' : '확정된 구매 기록이 아직 없어요'}
            </Text>
          </>
        )}
      </Card>

      <Button variant="secondary" label="가격 비교" onPress={() => router.push({ pathname: '/compare/[ingredientId]', params: { ingredientId: ingredient.id } })} />

      <SectionHeader title="구매 단가 기록" />
      <Card>
        <PriceDots history={history} baseUnit={ingredient.baseUnit} />
      </Card>

      <SectionHeader title="구매 이력" />
      <Card>
        {sorted.length === 0 ? (
          <StateView kind="empty" title="구매 기록이 없어요" message="영수증을 등록하면 단가가 계산돼요" actionLabel="영수증 등록" onAction={() => router.push('/records/upload')} />
        ) : (
          sorted.map((item, index) => (
            <ListRow
              key={item.id}
              title={`${formatDateKo(item.date)} · ${item.supplierName}`}
              subtitle={`${formatQty(item.packSize, item.packUnit)} × ${item.quantity}개 · ${formatWon(item.amount)}`}
              value={item.unitPricePerBase === null ? <Chip label="단위 확인 필요" tone="warning" /> : formatUnitPrice(item.unitPricePerBase, ingredient.baseUnit)}
              valueCaption={item.unitPricePerBase === null ? `기본 단위 ${unitLabel(ingredient.baseUnit)}` : undefined}
              divider={index < sorted.length - 1}
            />
          ))
        )}
      </Card>

      <SectionHeader title="이 재료를 쓰는 메뉴" />
      <Card>
        {menus.length === 0 ? (
          <Notice>이 재료를 쓰는 메뉴가 없어요</Notice>
        ) : (
          menus.map((menu, index) => {
            const line = menu.recipe.find((recipeLine) => recipeLine.ingredientId === ingredient.id);
            return (
              <ListRow
                key={menu.id}
                title={menu.name}
                subtitle={line ? `${menu.servingLabel} ${formatQty(line.amount, line.unit)} 사용` : menu.servingLabel}
                chevron
                divider={index < menus.length - 1}
                onPress={() => router.push({ pathname: '/menus/[id]', params: { id: menu.id } })}
              />
            );
          })
        )}
      </Card>

      <SectionHeader title="영수증 표기" />
      <AliasCard ingredient={ingredient} />

      <EditSheet key={editOpen ? 'open' : 'closed'} visible={editOpen} ingredient={ingredient} onClose={() => setEditOpen(false)} />
    </Screen>
  );
}

const CHART_HEIGHT = 180;
const PAD = { top: space.s4, right: space.s3, bottom: space.s6, left: space.s10 + space.s4 };
const DOT_RADIUS = 3;
const AXIS_FONT = typography.caption.fontFamily;

function PriceDots({ history, baseUnit }: { history: IngredientHistoryItem[]; baseUnit: BaseUnit }) {
  const [width, setWidth] = useState(0);
  const points = history
    .filter((item): item is IngredientHistoryItem & { unitPricePerBase: number } => item.unitPricePerBase !== null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (points.length === 0) return <Notice>단가를 계산할 수 있는 구매 기록이 없어요</Notice>;

  const scale = baseUnit === 'ea' ? 1 : 100;
  const values = points.map((point) => point.unitPricePerBase * scale);
  const max = Math.max(...values) * 1.15;
  const times = points.map((point) => Date.parse(point.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const unitText = baseUnit === 'ea' ? '개당' : `100${baseUnit}당`;
  const coords = points.map((point, index) => ({ cx: x(times[index]), cy: y(values[index]), point }));

  return (
    <View style={styles.chartWrap}>
      <View style={styles.legend}>
        <Svg width={DOT_RADIUS * 4} height={DOT_RADIUS * 4}>
          <Circle cx={DOT_RADIUS * 2} cy={DOT_RADIUS * 2} r={DOT_RADIUS} fill={colors.primary} />
        </Svg>
        <Text style={typography.caption}>내 구매 기록 · {unitText} 가격 · 0원부터</Text>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.chart}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            {ticks.map((tick) => (
              <Line key={`g${tick}`} x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={colors.line} strokeWidth={lineWidth} strokeDasharray="2 4" />
            ))}
            {ticks.map((tick) => (
              <SvgText key={`t${tick}`} x={PAD.left - space.s2} y={y(tick) + fontSize.xs / 3} fontSize={fontSize.xs} fontFamily={AXIS_FONT} fill={colors.text2} textAnchor="end">
                {formatWon(tick)}
              </SvgText>
            ))}
            {coords.slice(1).map((coord, index) => (
              <Line
                key={`l${coord.point.id}`}
                x1={coords[index].cx}
                y1={coords[index].cy}
                x2={coord.cx}
                y2={coord.cy}
                stroke={colors.primary}
                strokeWidth={lineWidth}
                strokeDasharray="2 4"
              />
            ))}
            {coords.map((coord) => (
              <Circle key={coord.point.id} cx={coord.cx} cy={coord.cy} r={DOT_RADIUS} fill={colors.primary} />
            ))}
            {coords.map((coord, index) =>
              index === 0 || index === coords.length - 1 ? (
                <SvgText
                  key={`d${coord.point.id}`}
                  x={coord.cx}
                  y={CHART_HEIGHT - space.s2}
                  fontSize={fontSize.xs}
                  fontFamily={AXIS_FONT}
                  fill={colors.text2}
                  textAnchor={coords.length === 1 ? 'middle' : index === 0 ? 'start' : 'end'}
                >
                  {formatDateKo(coord.point.date)}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
      </View>
      <Text style={typography.caption}>
        {points.map((point) => `${formatDateKo(point.date)} ${formatUnitPrice(point.unitPricePerBase, baseUnit)}`).join(' → ')}
      </Text>
      <Notice>점은 실제 구매한 날이에요. 점선은 구매 사이를 이은 것일 뿐 그 사이 가격이 아니에요</Notice>
    </View>
  );
}

function AliasCard({ ingredient }: { ingredient: Ingredient }) {
  const addAlias = useAddAlias(ingredient.id);
  const [alias, setAlias] = useState('');
  const [touched, setTouched] = useState(false);
  const trimmed = alias.trim();
  const duplicate = ingredient.aliases.includes(trimmed) || trimmed === ingredient.name;
  const fieldError = touched && !trimmed ? '표기를 입력해 주세요' : trimmed && duplicate ? '이미 있는 표기예요' : undefined;

  const submit = () => {
    setTouched(true);
    if (!trimmed || duplicate) return;
    addAlias.mutate(
      { alias: trimmed },
      {
        onSuccess: () => {
          setAlias('');
          setTouched(false);
        },
      },
    );
  };

  return (
    <Card style={styles.aliasCard}>
      <Notice>영수증에 다르게 적힌 이름을 등록하면 다음부터 이 재료로 연결해요</Notice>
      {ingredient.aliases.length > 0 ? (
        <View style={styles.aliases}>
          {ingredient.aliases.map((item) => (
            <Chip key={item} label={item} />
          ))}
        </View>
      ) : (
        <Text style={typography.secondary}>등록된 표기가 없어요</Text>
      )}
      <TextField label="새 표기" value={alias} onChangeText={setAlias} placeholder="예: 돈앞다리" error={fieldError} />
      {addAlias.isError ? <Text style={styles.errorText}>{messageOf(addAlias.error, '표기를 추가하지 못했어요')}</Text> : null}
      <Button variant="secondary" label={addAlias.isPending ? '추가 중…' : '표기 추가'} onPress={submit} loading={addAlias.isPending} />
    </Card>
  );
}

function EditSheet({ visible, ingredient, onClose }: { visible: boolean; ingredient: Ingredient; onClose: () => void }) {
  const update = useUpdateIngredient(ingredient.id);
  const [name, setName] = useState(ingredient.name);
  const [spec, setSpec] = useState(ingredient.spec ?? '');
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(ingredient.baseUnit);
  const nameError = !name.trim() ? '재료 이름을 입력해 주세요' : undefined;

  const submit = () => {
    if (nameError) return;
    const body = {
      ...(name.trim() !== ingredient.name ? { name: name.trim() } : {}),
      ...(spec.trim() && spec.trim() !== (ingredient.spec ?? '') ? { spec: spec.trim() } : {}),
      ...(baseUnit !== ingredient.baseUnit ? { baseUnit } : {}),
    };
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate(body, { onSuccess: onClose });
  };

  const conflict = update.error instanceof ApiError && update.error.status === 409;

  return (
    <Sheet
      visible={visible}
      title="식재료 수정"
      onClose={onClose}
      actions={<Button label={update.isPending ? '저장 중…' : '저장'} onPress={submit} loading={update.isPending} disabled={Boolean(nameError)} />}
    >
      <TextField label="재료 이름" value={name} onChangeText={setName} error={nameError} />
      <TextField label="규격" value={spec} onChangeText={setSpec} placeholder="예: 국산 냉장" hint={ingredient.spec ? '규격을 비우면 기존 규격을 유지해요' : undefined} />
      <Text style={typography.secondary}>기본 단위</Text>
      <SegmentedControl options={UNIT_OPTIONS} value={baseUnit} onChange={setBaseUnit} />
      <Notice>구매 기록이 있으면 기본 단위를 바꿀 수 없어요</Notice>
      {update.isError ? (
        <View style={conflict ? styles.conflict : undefined}>
          <Text style={conflict ? styles.conflictText : styles.errorText}>{messageOf(update.error, '저장하지 못했어요. 다시 시도해 주세요')}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  editButton: { paddingHorizontal: space.s4 },
  highlight: { gap: space.s2 },
  highlightLabel: { ...typography.secondary, color: colors.text },
  highlightBody: { ...typography.body, color: colors.text },
  chartWrap: { gap: space.s3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  chart: { height: CHART_HEIGHT, width: '100%' },
  aliasCard: { gap: space.s3 },
  aliases: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  errorText: { ...typography.caption, color: colors.loss },
  conflict: { backgroundColor: colors.accent50, padding: space.s3, borderRadius: radius.sm },
  conflictText: { ...typography.secondary, color: colors.warn },
});
