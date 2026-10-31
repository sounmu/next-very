import { describe, expect, it } from 'vitest';
import { computeMenuCost, unitPriceFromPack } from '../cost';
import { seed } from '../seed';
import type { Invoice, Purchase } from '../types';
import {
  ConfirmResultSchema,
  InvoiceConfirmSchema,
  InvoiceCreateResponseSchema,
  InvoiceDetailSchema,
  type ConfirmResult,
  type InvoiceDetail,
} from './invoice';

const { demoExtract, purchases, menus } = seed;

const invoice: Invoice = {
  id: 'invoice-1',
  imageId: 'image-1',
  supplierId: 'hanuri',
  date: demoExtract.date,
  status: 'extracted',
  extraction: demoExtract,
  isDemo: true,
};

const novemberPurchase: Purchase = {
  id: 'purchase-pork-shoulder-2026-11-04',
  ingredientId: 'pork-shoulder',
  supplierId: 'hanuri',
  date: demoExtract.date,
  packWeightG: 10000,
  quantity: 1,
  amount: 90000,
  unitPrice: unitPriceFromPack(90000, 1, 10000),
  status: 'confirmed',
  invoiceId: invoice.id,
};

const detail: InvoiceDetail = {
  invoice,
  supplier: { id: 'hanuri', name: demoExtract.supplier, registered: true },
  items: [
    {
      index: 0,
      item: demoExtract.items[0]!,
      suggestedIngredientId: 'pork-shoulder',
      ingredientName: '돼지고기 앞다리',
      unitPricePerKg: 9000,
      previousUnitPrice: 10000,
      quote: { supplierId: 'hanuri', unitPrice: 9000 },
      issues: [],
    },
  ],
};

function confirmResult(): ConfirmResult {
  const jeyuk = menus.find((m) => m.id === 'jeyuk-deopbap');
  if (!jeyuk) throw new Error('seed menu missing: jeyuk-deopbap');
  return {
    purchases: [novemberPurchase],
    changes: [
      {
        menuId: jeyuk.id,
        menuName: jeyuk.name,
        before: computeMenuCost(jeyuk, purchases),
        after: computeMenuCost(jeyuk, [...purchases, novemberPurchase]),
      },
    ],
  };
}

describe('InvoiceCreateResponseSchema', () => {
  it('parses the demo invoice', () => {
    expect(InvoiceCreateResponseSchema.parse({ invoice })).toEqual({ invoice });
  });

  it('rejects a response without an invoice', () => {
    expect(InvoiceCreateResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('InvoiceDetailSchema', () => {
  it('parses a matched row', () => {
    expect(InvoiceDetailSchema.parse(detail)).toEqual(detail);
  });

  it('parses an unmatched row and an unregistered supplier', () => {
    const unmatched: InvoiceDetail = {
      invoice: { ...invoice, supplierId: undefined },
      supplier: { id: null, name: demoExtract.supplier, registered: false },
      items: [
        {
          index: 0,
          item: { ...demoExtract.items[0]!, packWeightG: null, confidence: 'low' },
          suggestedIngredientId: null,
          ingredientName: null,
          unitPricePerKg: null,
          previousUnitPrice: null,
          quote: null,
          issues: ['packWeightG missing'],
        },
      ],
    };
    expect(InvoiceDetailSchema.safeParse(unmatched).success).toBe(true);
  });

  it('rejects a negative row index', () => {
    const bad = { ...detail, items: [{ ...detail.items[0]!, index: -1 }] };
    expect(InvoiceDetailSchema.safeParse(bad).success).toBe(false);
  });
});

describe('ConfirmResultSchema', () => {
  it('parses the demo confirmation: 제육덮밥 3,200원 -> 3,000원', () => {
    const result = confirmResult();
    const parsed = ConfirmResultSchema.parse(result);
    expect(parsed).toEqual(result);
    expect(parsed.changes[0]!.before.total).toBe(3200);
    expect(parsed.changes[0]!.after.total).toBe(3000);
  });

  it('rejects a purchase with an unknown status', () => {
    const result = confirmResult();
    const bad = { ...result, purchases: [{ ...novemberPurchase, status: 'done' }] };
    expect(ConfirmResultSchema.safeParse(bad).success).toBe(false);
  });
});

describe('InvoiceConfirmSchema', () => {
  const valid = {
    supplierId: 'hanuri',
    date: '2026-11-04',
    items: [{ ingredientId: 'pork-shoulder', packWeightG: 10000, quantity: 1, amount: 90000 }],
  };

  it('accepts a corrected row', () => {
    expect(InvoiceConfirmSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a body that omits supplierId and date', () => {
    expect(InvoiceConfirmSchema.safeParse({ items: valid.items }).success).toBe(true);
  });

  it('rejects an empty item list', () => {
    expect(InvoiceConfirmSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects a zero amount, a zero pack weight and a bad date', () => {
    const row = valid.items[0]!;
    expect(InvoiceConfirmSchema.safeParse({ ...valid, items: [{ ...row, amount: 0 }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ ...valid, items: [{ ...row, packWeightG: 0 }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ ...valid, date: '11/04' }).success).toBe(false);
  });
});
