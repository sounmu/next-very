import type { Ingredient, Menu } from '@marginlog/core';
import { MenuUpsertSchema } from '@marginlog/core/src/api/menu';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ApiError } from '@/api';
import { useIngredients, useMenuDetail, useSaveMenu } from '@/api/menu';
import {
  Button,
  Card,
  colors,
  control,
  Header,
  iconSize,
  lineWidth,
  Notice,
  opacity,
  radius,
  Row,
  Screen,
  space,
  typography,
} from '@/ui';

type RecipeRow = { key: number; ingredientId: string | null; grams: string };
type FormInitial = { name: string; price: string; rows: RecipeRow[] };

const EMPTY_FORM: FormInitial = { name: '', price: '', rows: [{ key: 0, ingredientId: null, grams: '' }] };

/** design/tokens.css .scrim; tokens.ts has no scrim color yet. */
const SCRIM = 'rgba(17,24,39,0.45)';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '불러오지 못했어요';
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function digitsOnly(text: string): string {
  return text.replace(/\D/g, '');
}

function fullName(ingredient: Ingredient): string {
  return ingredient.spec ? `${ingredient.name} · ${ingredient.spec}` : ingredient.name;
}

function fromMenu(menu: Menu): FormInitial {
  return {
    name: menu.name,
    price: String(menu.price),
    rows: menu.recipe.map((line, key) => ({ key, ingredientId: line.ingredientId, grams: String(line.grams) })),
  };
}

export default function RecipeEditScreen() {
  const { menuId } = useLocalSearchParams<{ menuId: string }>();
  const router = useRouter();
  const isNew = menuId === 'new';
  const ingredients = useIngredients();
  const detail = useMenuDetail(isNew ? undefined : menuId);

  let body;
  if (ingredients.isPending || (!isNew && detail.isPending)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (ingredients.isError) {
    body = (
      <Card>
        <Text style={typography.bodyStrong}>재료 목록을 불러오지 못했어요</Text>
        <Notice style={styles.detail}>{errorMessage(ingredients.error)}</Notice>
        <Button variant="secondary" label="다시 시도" onPress={() => void ingredients.refetch()} style={styles.retry} />
      </Card>
    );
  } else if (!isNew && detail.isError) {
    body = isNotFound(detail.error) ? (
      <Card>
        <Text style={typography.bodyStrong}>메뉴를 찾을 수 없어요</Text>
        <Notice style={styles.detail}>삭제되었거나 주소가 잘못되었어요.</Notice>
        <Button variant="secondary" label="메뉴 목록 보기" onPress={() => router.navigate('/')} style={styles.retry} />
      </Card>
    ) : (
      <Card>
        <Text style={typography.bodyStrong}>메뉴를 불러오지 못했어요</Text>
        <Notice style={styles.detail}>{errorMessage(detail.error)}</Notice>
        <Button variant="secondary" label="다시 시도" onPress={() => void detail.refetch()} style={styles.retry} />
      </Card>
    );
  } else {
    const initial = isNew ? EMPTY_FORM : detail.data ? fromMenu(detail.data.menu) : null;
    if (initial) {
      return (
        <RecipeForm
          key={menuId}
          menuId={menuId}
          initial={initial}
          ingredients={ingredients.data.ingredients}
          pricedIds={new Set(ingredients.data.pricedIds)}
        />
      );
    }
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen>
      <Header backLabel="메뉴 목록" title="메뉴·레시피 등록" />
      {body}
    </Screen>
  );
}

type RecipeFormProps = {
  menuId: string;
  initial: FormInitial;
  ingredients: Ingredient[];
  pricedIds: ReadonlySet<string>;
};

function RecipeForm({ menuId, initial, ingredients, pricedIds }: RecipeFormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const save = useSaveMenu();
  const [name, setName] = useState(initial.name);
  const [price, setPrice] = useState(initial.price);
  const [rows, setRows] = useState(initial.rows);
  const [pickingKey, setPickingKey] = useState<number | null>(null);

  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const parsed = MenuUpsertSchema.safeParse({
    name,
    price: Number(price),
    recipe: rows.map((row) => ({ ingredientId: row.ingredientId ?? '', grams: Number(row.grams) })),
  });

  const updateRow = (key: number, patch: Partial<RecipeRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: number) => setRows((current) => current.filter((row) => row.key !== key));
  const addRow = () =>
    setRows((current) => [
      ...current,
      { key: current.reduce((max, row) => Math.max(max, row.key), -1) + 1, ingredientId: null, grams: '' },
    ]);
  const closePicker = () => setPickingKey(null);
  const pick = (ingredientId: string) => {
    if (pickingKey !== null) updateRow(pickingKey, { ingredientId });
    closePicker();
  };
  const submit = () => {
    if (!parsed.success) return;
    save.mutate({ menuId, body: parsed.data }, { onSuccess: () => router.navigate('/') });
  };

  return (
    <Screen
      actions={
        <>
          {save.isError ? <Notice style={styles.saveError}>{`저장하지 못했어요 · ${errorMessage(save.error)}`}</Notice> : null}
          <Button label="저장하고 메뉴 목록 보기" onPress={submit} disabled={!parsed.success} loading={save.isPending} />
        </>
      }
    >
      <Header
        backLabel="메뉴 목록"
        title="메뉴·레시피 등록"
        subtitle={menuId === 'new' ? undefined : `${initial.name} 수정`}
      />

      <Card title="기본 정보">
        <View style={styles.fields}>
          <Field label="메뉴명">
            <View style={styles.input}>
              <TextInput
                style={styles.inputText}
                value={name}
                onChangeText={setName}
                placeholder="예: 제육덮밥"
                placeholderTextColor={colors.text3}
                autoCorrect={false}
              />
            </View>
          </Field>
          <Field label="판매가">
            <View style={styles.input}>
              <TextInput
                style={styles.inputText}
                value={price}
                onChangeText={(text) => setPrice(digitsOnly(text))}
                keyboardType="number-pad"
                placeholder="10000"
                placeholderTextColor={colors.text3}
              />
              <Text style={styles.suffix}>원</Text>
            </View>
          </Field>
          <Field label="기준 인분">
            <View style={[styles.input, styles.inputReadonly]}>
              <Text style={styles.readonlyText}>1인분</Text>
            </View>
          </Field>
        </View>
      </Card>

      <Card title="재료별 사용량 · 구매 중량 기준">
        {rows.map((row) => {
          const ingredient = row.ingredientId === null ? undefined : ingredientById.get(row.ingredientId);
          const unpriced = row.ingredientId !== null && !pricedIds.has(row.ingredientId);
          return (
            <View key={row.key} style={styles.recipeRow}>
              <View style={styles.recipeLine}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPickingKey(row.key)}
                  style={({ pressed }) => [styles.input, styles.picker, pressed && styles.pressed]}
                >
                  <Text numberOfLines={1} style={ingredient ? styles.inputText : styles.placeholder}>
                    {ingredient ? ingredient.name : '재료 선택'}
                  </Text>
                  <ChevronDownIcon />
                </Pressable>
                <View style={[styles.input, styles.grams]}>
                  <TextInput
                    style={styles.inputText}
                    value={row.grams}
                    onChangeText={(text) => updateRow(row.key, { grams: digitsOnly(text) })}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text3}
                  />
                  <Text style={styles.suffix}>g</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="재료 삭제"
                  onPress={() => removeRow(row.key)}
                  hitSlop={space.s1}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <CloseIcon />
                </Pressable>
              </View>
              {unpriced ? <Text style={styles.unpriced}>매입가 미등록</Text> : null}
            </View>
          );
        })}
        {rows.length === 0 ? <Notice style={styles.emptyRows}>재료를 하나 이상 추가해 주세요.</Notice> : null}
        {ingredients.length === 0 ? (
          <Notice style={styles.emptyRows}>등록된 재료가 없어요. 메뉴 목록 제목을 길게 눌러 시연 데이터로 초기화해 주세요.</Notice>
        ) : null}
        <Button
          variant="secondary"
          label="재료 추가"
          onPress={addRow}
          disabled={ingredients.length === 0 || rows.length >= ingredients.length}
        />
      </Card>

      <Notice>처음 한 번 사용량을 확인해 주세요. 이후에는 명세서로 구매가격을 갱신합니다.</Notice>
      <Notice align="center">미등록 재료가 있으면 전체 원가로 표시하지 않아요.</Notice>

      <Modal visible={pickingKey !== null} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.scrim} onPress={closePicker} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.s5) }]}>
            <View style={styles.grabber} />
            <Text style={typography.heading}>재료 선택</Text>
            <ScrollView style={styles.sheetList}>
              {ingredients.map((ingredient, index) => {
                const taken = rows.some((row) => row.key !== pickingKey && row.ingredientId === ingredient.id);
                return (
                  <Pressable
                    key={ingredient.id}
                    accessibilityRole="button"
                    disabled={taken}
                    onPress={() => pick(ingredient.id)}
                    style={({ pressed }) => [pressed && styles.pressed, taken && styles.taken]}
                  >
                    <Row
                      label={fullName(ingredient)}
                      hint={pricedIds.has(ingredient.id) ? undefined : '매입가 미등록'}
                      value={taken ? <Text style={typography.caption}>추가됨</Text> : undefined}
                      divider={index < ingredients.length - 1}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={typography.secondary}>{label}</Text>
      {children}
    </View>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={colors.text3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={colors.text2} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.s8, alignItems: 'center' },
  pressed: { opacity: opacity.pressed },
  detail: { marginTop: space.s1 },
  retry: { marginTop: space.s4 },
  fields: { gap: space.s4 },
  field: { gap: space.s2 },
  input: {
    height: control.inputHeight,
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  inputText: { flex: 1, ...typography.body, fontWeight: '500', paddingVertical: 0 },
  placeholder: { flex: 1, ...typography.body, color: colors.text3 },
  suffix: typography.secondary,
  inputReadonly: { backgroundColor: colors.bg },
  readonlyText: { ...typography.body, color: colors.text2, fontWeight: '500' },
  recipeRow: { marginBottom: space.s3, gap: space.s1 },
  recipeLine: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  picker: { flex: 2 },
  grams: { flex: 1 },
  remove: {
    width: control.iconButton,
    height: control.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -space.s2,
  },
  unpriced: { ...typography.caption, color: colors.warn },
  emptyRows: { marginBottom: space.s3 },
  saveError: { color: colors.loss },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: SCRIM },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.s3,
    paddingHorizontal: space.s5,
    maxHeight: '70%',
    gap: space.s3,
  },
  /** design/tokens.css .sheet::before */
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.line },
  sheetList: { flexGrow: 0 },
  taken: { opacity: opacity.disabled },
});
