import { isUnit, toBase, baseOf, type ExtractResult } from "@marginlog/core";

const MAX_PACK_BASE = { g: 50000, mL: 50000, ea: 1000 } as const;

const won = (n: number): string => `${n.toLocaleString("ko-KR")}원`;

/** Per-item "확인 필요" reasons, index-aligned with result.items. A total mismatch is reported on every item. */
export function extractIssues(result: ExtractResult): string[][] {
  const sum = result.items.reduce((s, i) => s + i.amount, 0);
  const totalNote = sum !== result.total ? `품목 금액 합계 ${won(sum)}가 총액 ${won(result.total)}와 달라요` : null;

  return result.items.map((item) => {
    const notes: string[] = [];
    const expected = Math.round(item.quantity * item.unitPrice);
    if (expected !== item.amount) {
      notes.push(`수량 x 단가(${won(expected)})가 금액 ${won(item.amount)}와 달라요`);
    }
    if (item.packSize === null) notes.push("포장 용량을 읽지 못했어요");
    if (item.packUnit === null) {
      notes.push("포장 단위를 읽지 못했어요");
    } else if (!isUnit(item.packUnit)) {
      notes.push(`포장 단위 "${String(item.packUnit)}"는 쓸 수 없어요(g, kg, mL, L, 개)`);
    } else if (item.packSize !== null) {
      const base = baseOf(item.packUnit);
      const qty = toBase(item.packSize, item.packUnit, base);
      if (qty !== null && (qty <= 0 || qty > MAX_PACK_BASE[base])) {
        notes.push(`포장 용량 ${item.packSize}${item.packUnit === "ea" ? "개" : item.packUnit}이 범위를 벗어나요`);
      }
    }
    if (totalNote) notes.push(totalNote);
    return notes;
  });
}

/**
 * Marks items with arithmetic or pack problems as confidence 'low' and puts the
 * Korean notes in `note`. Recomputed from the numbers, so it is idempotent.
 */
export function validateExtract(result: ExtractResult): ExtractResult {
  const issues = extractIssues(result);
  return {
    ...result,
    items: result.items.map((item, i) => {
      const { note: _old, ...rest } = item;
      return issues[i].length > 0
        ? { ...rest, confidence: "low", note: issues[i].join(" · ") }
        : { ...rest, confidence: "high" };
    }),
  };
}
