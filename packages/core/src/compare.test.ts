import { describe, expect, it } from 'vitest';
import { compareOffers } from './compare';
import { buildOrder } from './order';
import { seed } from './seed';
import type { Ingredient, SupplierProduct } from './types';

function ingredient(id: string): Ingredient {
  const found = seed.ingredients.find((item) => item.id === id);
  if (!found) throw new Error(`Missing ingredient ${id}`);
  return found;
}

describe('supplier comparisons', () => {
  it.each([
    ['pork-shoulder', 10000, 'hanuri', 93000],
    ['milk', 12000, 'dairy-direct', 35200],
    ['coffee-beans', 1000, 'coffee-lab', 27444],
    ['onion', 15000, 'greenfarm', 42000],
  ])('recommends %s by total cost for %s base units', (id, needed, supplierId, total) => {
    const result = compareOffers(ingredient(id), seed.products, needed);
    const recommended = result.offers.find((offer) => offer.product.id === result.recommendedId);
    expect(recommended).toMatchObject({ product: { supplierId }, total, comparable: true, meetsMinOrder: true });
  });

  it('excludes a cheaper frozen import by spec and lists comparable products first', () => {
    const result = compareOffers(ingredient('pork-shoulder'), seed.products, 10000);
    expect(result.offers.map((offer) => offer.product.supplierId)).toEqual(['hanuri', 'daesung', 'meatone']);
    expect(result.offers[2]).toMatchObject({ comparable: false, reason: 'spec', packs: 2, itemsTotal: 65000, total: 69000 });
  });

  it('keeps a cheaper offer visible while excluding it for unmet minimum order', () => {
    const result = compareOffers(ingredient('coffee-beans'), seed.products, 1000);
    expect(result.offers[0]).toMatchObject({
      product: { supplierId: 'bean-market' }, comparable: true, meetsMinOrder: false,
      itemsTotal: 22000, shippingFee: 3500, total: 25500,
    });
    expect(result.recommendedId).toBe('product-coffee-beans-coffee-lab');
  });

  it('does not compare grams to milk volume', () => {
    const wrong: SupplierProduct = { ...seed.products[3], id: 'wrong-unit', packUnit: 'kg' };
    const result = compareOffers(ingredient('milk'), [wrong], 12000);
    expect(result.recommendedId).toBeNull();
    expect(result.offers[0]).toMatchObject({ comparable: false, reason: 'unit', unitPricePerBase: null });
  });

  it('rounds needed packs upward and keeps item and shipping totals separate', () => {
    const product = seed.products[3];
    const result = compareOffers(ingredient('milk'), [product], 12001);
    expect(result.offers[0]).toMatchObject({
      packs: 13, unitPricePerBase: 2.8, itemsTotal: 36400, shippingFee: 3000, total: 39400,
    });
  });

  it('uses at least one pack even for zero requested quantity', () => {
    const result = compareOffers(ingredient('onion'), seed.products, 0);
    expect(result.offers.map((offer) => offer.packs)).toEqual([1, 1]);
  });

  it('returns no recommendation when no minimum is met', () => {
    const result = compareOffers(ingredient('milk'), seed.products, 1000);
    expect(result.recommendedId).toBeNull();
    expect(result.offers).toHaveLength(2);
  });

  it('returns no offers for an ingredient without catalog products', () => {
    expect(compareOffers(ingredient('rice'), seed.products, 1000)).toEqual({ offers: [], recommendedId: null });
  });

  it('breaks total ties by unit price then product id', () => {
    const product = seed.products[3];
    const products: SupplierProduct[] = [
      { ...product, id: 'expensive-unit', price: 2800, shippingFee: 0, minOrderAmount: 0 },
      { ...product, id: 'b', price: 2600, shippingFee: 200, minOrderAmount: 0 },
      { ...product, id: 'a', price: 2600, shippingFee: 200, minOrderAmount: 0 },
    ];
    expect(compareOffers(ingredient('milk'), products, 1000).recommendedId).toBe('a');
  });
});

describe('demo order totals', () => {
  it('charges the maximum shipping fee once per supplier', () => {
    const first: SupplierProduct = { ...seed.products[3], id: 'first', price: 2800, shippingFee: 3000 };
    const second: SupplierProduct = { ...first, id: 'second', price: 2600, shippingFee: 4000 };
    const other: SupplierProduct = { ...first, id: 'other', supplierId: 'other-supplier', price: 1000, shippingFee: 500 };
    const result = buildOrder([
      { productId: first.id, quantity: 2 },
      { productId: second.id, quantity: 3 },
      { productId: other.id, quantity: 1 },
    ], [first, second, other]);
    expect(result).toMatchObject({ itemsTotal: 14400, shippingTotal: 4500, total: 18900 });
    expect(result.lines.map((line) => line.amount)).toEqual([5600, 7800, 1000]);
    expect(result.lines[0]).toMatchObject({
      productId: first.id, supplierId: first.supplierId, ingredientId: 'milk',
      packSize: 1, packUnit: 'L', quantity: 2, price: 2800,
    });
    expect(new Set(result.lines.map((line) => line.id)).size).toBe(3);
  });

  it('does not depend on cart order to select the supplier shipping fee', () => {
    const high: SupplierProduct = { ...seed.products[3], id: 'high', shippingFee: 4000 };
    const low: SupplierProduct = { ...high, id: 'low', shippingFee: 1000 };
    const result = buildOrder([{ productId: high.id, quantity: 1 }, { productId: low.id, quantity: 1 }], [high, low]);
    expect(result.shippingTotal).toBe(4000);
  });

  it('assigns distinct line ids across orders for receive idempotency', () => {
    const cart = [{ productId: seed.products[0].id, quantity: 1 }];
    const first = buildOrder(cart, seed.products);
    const second = buildOrder(cart, seed.products);
    expect(first.lines[0].id).not.toBe(second.lines[0].id);
  });

  it('builds an empty order with zero totals', () => {
    expect(buildOrder([], seed.products)).toEqual({ lines: [], itemsTotal: 0, shippingTotal: 0, total: 0 });
  });
});
