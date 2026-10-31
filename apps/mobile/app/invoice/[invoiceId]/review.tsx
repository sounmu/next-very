import { unitPriceFromPack } from '@marginlog/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { invoiceImageUrl, useConfirmInvoice, useInvoice, type InvoiceDetail } from '@/api/invoice';
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

type DetailItem = InvoiceDetail['items'][number];

type Draft = {
  packWeightKg: string;
  quantity: string;
  amount: string;
};

type Parsed = {
  packWeightG: number | null;
  quantity: number | null;
  amount: number | null;
};

function monthDay(date: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[1]}/${match[2]}` : date;
}

function initialDraft(item: DetailItem['item']): Draft {
  return {
    packWeightKg: item.packWeightG !== null && item.packWeightG > 0 ? String(item.packWeightG / 1000) : '',
    quantity: item.quantity > 0 ? String(item.quantity) : '',
    amount: item.amount > 0 ? String(item.amount) : '',
  };
}

function parsePositive(text: string): number | null {
  const n = Number(text.replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDraft(draft: Draft): Parsed {
  const kg = parsePositive(draft.packWeightKg);
  const grams = kg === null ? 0 : Math.round(kg * 1000);
  const amount = parsePositive(draft.amount);
  return {
    packWeightG: grams > 0 ? grams : null,
    quantity: parsePositive(draft.quantity),
    amount: amount === null ? null : Math.round(amount),
  };
}

function unitPriceOf(parsed: Parsed): number | null {
  if (parsed.packWeightG === null || parsed.quantity === null || parsed.amount === null) return null;
  return unitPriceFromPack(parsed.amount, parsed.quantity, parsed.packWeightG);
}

function quoteCheck(quote: DetailItem['quote'], unitPrice: number | null): { text: string; tone: string } | null {
  if (!quote) return null;
  const quoted = formatWon(quote.unitPrice, { unit: '원/kg' });
  if (unitPrice === null) return { text: `등록한 견적 ${quoted}`, tone: colors.text2 };
  const diff = unitPrice - quote.unitPrice;
  if (diff === 0) return { text: `등록한 견적 ${quoted}과 같아요`, tone: colors.primary };
  const direction = diff > 0 ? '높아요' : '낮아요';
  return { text: `등록한 견적 ${quoted}보다 ${formatWon(Math.abs(diff), { unit: '원/kg' })} ${direction}`, tone: colors.warn };
}

function Chip({ tone, children }: { tone: 'primary' | 'warn'; children: string }) {
  return (
    <View style={[styles.chip, tone === 'primary' ? styles.chipPrimary : styles.chipWarn]}>
      <Text style={[styles.chipText, tone === 'primary' ? styles.chipTextPrimary : styles.chipTextWarn]}>{children}</Text>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  unit: string;
  warn: boolean;
  placeholder?: string;
  keyboardType: KeyboardTypeOptions;
  onChangeText: (text: string) => void;
};

function Field({ label, value, unit, warn, placeholder = '0', keyboardType, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, warn && styles.inputWarn]}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          inputMode={keyboardType === 'number-pad' ? 'numeric' : 'decimal'}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          selectTextOnFocus
        />
        <Text style={styles.inputUnit}>{unit}</Text>
      </View>
    </View>
  );
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
            accessibilityLabel="거래명세서 원본 사진"
            onError={() => setFailed(true)}
          />
        )}
        <Button label="닫기" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

type ReviewRow = {
  entry: DetailItem;
  draft: Draft;
  parsed: Parsed;
  unitPrice: number | null;
  edited: boolean;
  flagged: boolean;
  complete: boolean;
};

function buildRows(detail: InvoiceDetail, edits: Record<number, Partial<Draft>>): ReviewRow[] {
  return detail.items.map((entry) => {
    const draft = { ...initialDraft(entry.item), ...edits[entry.index] };
    const parsed = parseDraft(draft);
    const unitPrice = unitPriceOf(parsed);
    const edited = entry.index in edits;
    return {
      entry,
      draft,
      parsed,
      unitPrice,
      edited,
      flagged: !edited && (entry.item.confidence === 'low' || entry.issues.length > 0),
      complete: unitPrice !== null && entry.suggestedIngredientId !== null,
    };
  });
}

export default function InvoiceReviewScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const detailQuery = useInvoice(invoiceId);
  const confirm = useConfirmInvoice(invoiceId ?? '');
  const [edits, setEdits] = useState<Record<number, Partial<Draft>>>({});
  const [showImage, setShowImage] = useState(false);

  const detail = detailQuery.data;
  const rows = detail ? buildRows(detail, edits) : [];
  const alreadyConfirmed = detail?.invoice.status === 'confirmed' && !confirm.isPending && !confirm.isSuccess;
  const needsReview = rows.some((row) => row.flagged || !row.complete);
  const canConfirm = rows.length > 0 && rows.every((row) => row.complete) && !alreadyConfirmed;

  function setField(index: number, field: keyof Draft, text: string) {
    setEdits((prev) => ({ ...prev, [index]: { ...prev[index], [field]: text } }));
  }

  function submit() {
    if (!detail || !invoiceId) return;
    const items = rows.flatMap((row) => {
      const { packWeightG, quantity, amount } = row.parsed;
      const ingredientId = row.entry.suggestedIngredientId;
      return ingredientId !== null && packWeightG !== null && quantity !== null && amount !== null
        ? [{ ingredientId, packWeightG, quantity, amount }]
        : [];
    });
    if (items.length !== rows.length) return;
    confirm.mutate(
      { supplierId: detail.supplier.id ?? undefined, items },
      {
        onSuccess: () => router.replace({ pathname: '/invoice/[invoiceId]/done', params: { invoiceId } }),
      },
    );
  }

  const subtitle = detail
    ? `${rows.length}개 품목 추출 · ${needsReview ? '확인 필요' : '확인 완료'}`
    : undefined;

  const actions = (() => {
    if (!detail) return undefined;
    if (alreadyConfirmed) return <Button label="메뉴 목록으로" onPress={() => router.replace('/')} />;
    return (
      <>
        <Notice>아래 버튼을 누르면 입력값을 확인한 것으로 처리하고 새 매입가격을 반영합니다.</Notice>
        {confirm.isError ? <Notice style={styles.errorText}>{confirm.error.message}</Notice> : null}
        <Button
          label={confirm.isError ? '다시 시도' : '확인하고 메뉴 원가 갱신'}
          onPress={submit}
          disabled={!canConfirm}
          loading={confirm.isPending}
        />
        <Notice align="center">불확실한 품목은 확인 전 원가 계산에서 제외</Notice>
      </>
    );
  })();

  return (
    <Screen actions={actions}>
      <Header
        backLabel="명세서 등록"
        title="매입 내역 확인"
        subtitle={subtitle}
        right={detail?.invoice.isDemo ? <Chip tone="warn">데모 데이터</Chip> : undefined}
      />

      {!invoiceId ? (
        <Card>
          <Notice align="center" style={styles.errorText}>
            명세서를 찾을 수 없어요
          </Notice>
          <Button label="메뉴 목록으로" variant="secondary" onPress={() => router.replace('/')} style={styles.cardAction} />
        </Card>
      ) : detailQuery.isPending ? (
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Notice align="center" style={styles.loadingText}>
            매입 내역을 불러오고 있어요
          </Notice>
        </Card>
      ) : detailQuery.isError ? (
        <Card>
          <Notice align="center" style={styles.errorText}>
            {detailQuery.error.message}
          </Notice>
          <Button label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} style={styles.cardAction} />
        </Card>
      ) : detail ? (
        <>
          <Button label="원본 사진 보기" variant="secondary" onPress={() => setShowImage(true)} />
          <ImageModal uri={invoiceImageUrl(invoiceId)} visible={showImage} onClose={() => setShowImage(false)} />

          {alreadyConfirmed ? <Notice style={styles.confirmedText}>이미 반영된 명세서예요. 다시 반영할 수 없어요.</Notice> : null}

          <Card>
            <View style={styles.supplierHead}>
              <Text style={styles.supplierName}>{detail.supplier.name || detail.invoice.extraction.supplier || '구매처 미상'}</Text>
              <Chip tone={detail.supplier.registered ? 'primary' : 'warn'}>
                {detail.supplier.registered ? '등록한 구매처' : '새 구매처로 등록돼요'}
              </Chip>
            </View>
            <Text style={styles.supplierDate}>
              {(() => {
                const date = detail.invoice.date ?? detail.invoice.extraction.date;
                return date ? `거래일 ${monthDay(date)}` : '거래일 미상';
              })()}
            </Text>
          </Card>

          {rows.length === 0 ? (
            <Card>
              <Notice align="center">추출된 품목이 없어요. 다른 사진으로 다시 등록해 주세요.</Notice>
            </Card>
          ) : null}

          {rows.map((row) => {
            const { entry, draft, parsed, unitPrice } = row;
            const quote = quoteCheck(entry.quote, unitPrice);
            const newPrice = unitPrice ?? entry.unitPricePerKg;
            const previous = entry.previousUnitPrice;
            return (
              <View key={entry.index} style={styles.itemGroup}>
                <Card variant="emphasis" style={row.flagged ? styles.itemFlagged : undefined}>
                  <View style={styles.itemHead}>
                    <Text style={styles.itemName}>{entry.item.rawName || `품목 ${entry.index + 1}`}</Text>
                    {row.flagged ? <Chip tone="warn">확인 필요</Chip> : null}
                  </View>
                  <Field
                    label="규격"
                    value={draft.packWeightKg}
                    unit="kg"
                    warn={parsed.packWeightG === null}
                    placeholder="예: 10"
                    keyboardType="decimal-pad"
                    onChangeText={(text) => setField(entry.index, 'packWeightKg', text)}
                  />
                  <Field
                    label="구매 수량"
                    value={draft.quantity}
                    unit={entry.item.packUnit || '개'}
                    warn={parsed.quantity === null}
                    keyboardType="decimal-pad"
                    onChangeText={(text) => setField(entry.index, 'quantity', text)}
                  />
                  <Field
                    label="구매 금액"
                    value={draft.amount}
                    unit="원"
                    warn={parsed.amount === null}
                    keyboardType="number-pad"
                    onChangeText={(text) => setField(entry.index, 'amount', text)}
                  />
                  <Row
                    label="환산 매입가"
                    hint={unitPrice === null ? '규격 · 수량 · 금액을 모두 입력하면 계산돼요' : undefined}
                    value={unitPrice === null ? '—' : formatWon(unitPrice, { unit: '원/kg' })}
                    bold
                    divider={false}
                  />
                  {entry.issues.map((issue) => (
                    <Text key={issue} style={styles.issue}>{`· ${issue}`}</Text>
                  ))}
                  {entry.item.note ? <Text style={styles.issue}>{`· ${entry.item.note}`}</Text> : null}
                  {quote ? <Text style={[styles.quote, { color: quote.tone }]}>{quote.text}</Text> : null}
                  <Notice style={styles.itemNotice}>원본을 보고 규격과 수량을 확인해 주세요.</Notice>
                </Card>

                <Card title="연결할 재료">
                  {entry.suggestedIngredientId !== null ? (
                    <>
                      <Text style={styles.ingredientName}>{entry.ingredientName ?? entry.suggestedIngredientId}</Text>
                      <Row
                        label={previous === null ? '새 매입가' : '이전 → 새 매입가'}
                        hint={previous === null ? '첫 매입이라 이전 매입가가 없어요' : undefined}
                        value={
                          newPrice === null ? (
                            '—'
                          ) : previous === null ? (
                            formatWon(newPrice, { unit: '원/kg' })
                          ) : (
                            <Text style={[styles.priceChange, { color: deltaColor(newPrice - previous) }]}>
                              {`${formatWon(previous, { unit: '' })} → ${formatWon(newPrice)}`}
                            </Text>
                          )
                        }
                        divider={false}
                      />
                    </>
                  ) : (
                    <Notice style={styles.warnText}>연결할 재료를 찾지 못했어요</Notice>
                  )}
                </Card>
              </View>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

/** Width of the bordered value box in a Field row; the label takes the rest of the row. */
const fieldInputWidth = 168;

const styles = StyleSheet.create({
  loadingText: { marginTop: space.s3 },
  errorText: { color: colors.loss },
  warnText: { color: colors.warn },
  confirmedText: { color: colors.warn, fontWeight: '600' },
  cardAction: { marginTop: space.s3 },
  chip: {
    height: control.chipHeight,
    paddingHorizontal: space.s2,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  chipPrimary: { backgroundColor: colors.primary50 },
  chipWarn: { backgroundColor: colors.accent50 },
  chipText: { fontSize: fontSize.xs, fontWeight: '600' },
  chipTextPrimary: { color: colors.primary },
  chipTextWarn: { color: colors.warn },
  supplierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s2 },
  supplierName: { ...typography.heading, flexShrink: 1 },
  supplierDate: { ...typography.secondary, fontWeight: '400', marginTop: space.s1 },
  itemGroup: { gap: space.s3 },
  itemFlagged: { borderWidth: lineWidth * 2, borderColor: colors.warn },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s2,
    marginBottom: space.s2,
  },
  itemName: { ...typography.sectionTitle, flexShrink: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s2 },
  fieldLabel: { ...typography.body, color: colors.text2, flex: 1 },
  inputWrap: {
    width: fieldInputWidth,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    height: control.inputHeight,
    paddingHorizontal: space.s3,
    borderWidth: lineWidth,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  inputWarn: { borderColor: colors.warn },
  input: {
    width: 0,
    flexGrow: 1,
    minWidth: 0,
    height: '100%',
    padding: 0,
    textAlign: 'right',
    ...typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
  inputUnit: { ...typography.caption, color: colors.text2 },
  issue: { ...typography.caption, color: colors.warn, marginTop: space.s1 },
  quote: { ...typography.secondary, marginTop: space.s2 },
  itemNotice: { marginTop: space.s2 },
  ingredientName: { ...typography.bodyStrong, marginBottom: space.s1 },
  priceChange: { ...typography.bodyStrong, fontVariant: ['tabular-nums'] },
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
