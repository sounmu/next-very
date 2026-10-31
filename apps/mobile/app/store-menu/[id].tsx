import { formatQty, type StoreMenu, type StoreRecipeLine, type Unit } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/session/SessionProvider';
import {
  Button,
  Card,
  Chip,
  Header,
  Notice,
  Row,
  Screen,
  SectionHeader,
  SegmentedControl,
  StateView,
  TextButton,
  TextField,
  colors,
  space,
  typography,
} from '@/ui';

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'mL', label: 'mL' },
  { value: 'L', label: 'L' },
  { value: 'ea', label: '개' },
] as const satisfies readonly { value: Unit; label: string }[];

type Draft = { key: string; name: string; amountText: string; unit: Unit; countLabel?: string };

let draftSeq = 0;
const toDraft = (line: StoreRecipeLine): Draft => ({
  key: `line-${++draftSeq}`,
  name: line.ingredientName,
  amountText: String(line.amount),
  unit: line.unit,
  countLabel: line.countLabel,
});

function parseAmount(text: string): number | null {
  const value = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

function qtyText(line: StoreRecipeLine): string {
  return line.unit === 'ea' && line.countLabel ? `${line.amount}${line.countLabel}` : formatQty(line.amount, line.unit);
}

export default function StoreMenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { menus } = useSession();
  const menu = menus.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);

  if (!menu) {
    return (
      <Screen>
        <Header backLabel="홈" title="메뉴" />
        <Card>
          <StateView kind="empty" title="메뉴를 찾을 수 없어요" actionLabel="홈으로" onAction={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }
  return editing ? <EditRecipe menu={menu} onDone={() => setEditing(false)} /> : <ViewRecipe menu={menu} onEdit={() => setEditing(true)} />;
}

function ViewRecipe({ menu, onEdit }: { menu: StoreMenu; onEdit: () => void }) {
  const example = menu.isExample && !menu.edited;
  return (
    <Screen>
      <Header backLabel="홈" title={menu.name} subtitle={`${menu.servingLabel} 기준`} />
      {example ? <Chip label="예시 레시피" tone="info" /> : null}

      <Card>
        <Text style={typography.cardTitle}>{menu.servingLabel} 식재료비</Text>
        <Text style={typography.amountLg}>계산 전</Text>
        <Text style={typography.caption}>재료 단가가 아직 없어요 · 구매 기록을 연결하면 계산해요</Text>
      </Card>

      <SectionHeader title="재료" actionLabel="레시피 수정" onAction={onEdit} />
      <Card>
        {menu.recipe.map((line, index) => (
          <Row
            key={`${line.ingredientName}-${index}`}
            label={line.ingredientName}
            hint="단가 미등록"
            value={qtyText(line)}
            divider={index < menu.recipe.length - 1}
          />
        ))}
      </Card>
      {example ? <Notice>업종에 맞춰 준비한 예시 레시피예요. 우리 가게 레시피에 맞게 고쳐 주세요.</Notice> : null}
    </Screen>
  );
}

function EditRecipe({ menu, onDone }: { menu: StoreMenu; onDone: () => void }) {
  const { saveRecipe } = useSession();
  const [drafts, setDrafts] = useState<Draft[]>(() => menu.recipe.map(toDraft));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const patch = (key: string, change: Partial<Draft>) =>
    setDrafts((list) => list.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));

  const invalid = drafts.some((draft) => draft.name.trim() === '' || parseAmount(draft.amountText) === null);

  async function save() {
    if (saving) return;
    setSubmitted(true);
    if (invalid) return;
    setSaving(true);
    setSaveError(false);
    try {
      await saveRecipe(
        menu.id,
        drafts.map((draft) => ({
          ingredientName: draft.name.trim(),
          amount: parseAmount(draft.amountText) ?? 0,
          unit: draft.unit,
          ...(draft.unit === 'ea' && draft.countLabel ? { countLabel: draft.countLabel } : {}),
        })),
      );
      onDone();
    } catch (error) {
      console.warn('[store-menu] could not save the recipe', error);
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <Screen
      actions={
        <>
          {saveError ? <Text style={styles.error}>저장하지 못했어요. 고친 내용은 그대로예요. 다시 시도해 주세요</Text> : null}
          {submitted && invalid ? <Text style={styles.reason}>모든 재료에 이름과 0보다 큰 사용량을 넣어 주세요</Text> : null}
          <Button label={saveError ? '다시 시도' : '레시피 저장'} onPress={save} loading={saving} disabled={saving} />
          <Button label="취소" variant="secondary" onPress={onDone} disabled={saving} />
        </>
      }
    >
      <Header backLabel="홈" title={`${menu.name} 레시피 수정`} subtitle={`${menu.servingLabel} 기준`} />

      {drafts.map((draft, index) => (
        <Card key={draft.key} style={styles.line}>
          <View style={styles.lineHead}>
            <Text style={[typography.bodyStrong, styles.grow]}>{`재료 ${index + 1}`}</Text>
            <TextButton
              label="빼기"
              tone="danger"
              disabled={drafts.length === 1}
              onPress={() => setDrafts((list) => list.filter((item) => item.key !== draft.key))}
            />
          </View>
          <TextField
            label="재료 이름"
            value={draft.name}
            onChangeText={(text) => patch(draft.key, { name: text })}
            placeholder="예: 우유"
            error={submitted && draft.name.trim() === '' ? '재료 이름을 입력해 주세요' : undefined}
          />
          <TextField
            label="사용량"
            value={draft.amountText}
            onChangeText={(text) => patch(draft.key, { amountText: text })}
            keyboardType="decimal-pad"
            align="right"
            suffix={draft.unit === 'ea' && draft.countLabel ? draft.countLabel : UNIT_OPTIONS.find((option) => option.value === draft.unit)?.label}
            error={submitted && parseAmount(draft.amountText) === null ? '0보다 큰 숫자를 입력해 주세요' : undefined}
          />
          <SegmentedControl options={UNIT_OPTIONS} value={draft.unit} onChange={(unit) => patch(draft.key, { unit })} />
        </Card>
      ))}

      <Button
        label="재료 추가"
        variant="secondary"
        onPress={() => setDrafts((list) => [...list, toDraft({ ingredientName: '', amount: 1, unit: 'g' })].map((item, i, all) => (i === all.length - 1 ? { ...item, amountText: '' } : item)))}
      />
      <Notice>단가는 재료 이름이 구매 기록과 연결된 뒤 계산해요.</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { gap: space.s3 },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  grow: { flex: 1 },
  reason: { ...typography.caption, textAlign: 'center' },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
