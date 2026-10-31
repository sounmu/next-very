import type { ExtractResult } from "@marginlog/core";

const MIN_PACK_G = 10;
const MAX_PACK_G = 50000;

const won = (n: number): string => `${n.toLocaleString("ko-KR")}원`;

/** Per-item problems, index-aligned with result.items. A total mismatch is reported on every item. */
export function extractIssues(result: ExtractResult): string[][] {
  const sum = result.items.reduce((s, i) => s + i.amount, 0);
  const totalNote = sum !== result.total ? `품목 금액 합계 ${won(sum)}가 명세서 합계 ${won(result.total)}와 다릅니다` : null;

  return result.items.map((item) => {
    const notes: string[] = [];
    const expected = Math.round(item.quantity * item.unitPrice);
    if (expected !== item.amount) {
      notes.push(`수량 x 단가(${won(expected)})가 금액 ${won(item.amount)}와 다릅니다`);
    }
    if (item.packWeightG === null) {
      notes.push("포장 중량을 읽지 못했습니다");
    } else if (item.packWeightG < MIN_PACK_G || item.packWeightG > MAX_PACK_G) {
      notes.push(`포장 중량 ${item.packWeightG.toLocaleString("ko-KR")}g이 범위(10g~50kg)를 벗어납니다`);
    }
    if (totalNote) notes.push(totalNote);
    return notes;
  });
}

/**
 * Marks items with arithmetic or weight problems as confidence 'low' and puts
 * the Korean notes in `note`. Recomputed from the numbers, so it is idempotent.
 */
export function validateExtract(result: ExtractResult): ExtractResult {
  const issues = extractIssues(result);
  return {
    ...result,
    items: result.items.map((item, i) => {
      const { note: _old, ...rest } = item;
      return issues[i].length > 0 ? { ...rest, confidence: "low", note: issues[i].join(" · ") } : rest;
    }),
  };
}
