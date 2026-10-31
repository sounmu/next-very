import { describe, expect, it } from 'vitest';
import { compareOffers } from '../compare';
import { computeMenuCost, costAlert, currentAndPrevious, monthSpend, priceChanges } from '../cost';
import { consumption, nextSettleDate, soldByMenu, stockOf } from '../inventory';
import { buildOrder } from '../order';
import { seed } from '../seed';
import { unitPricePerBase } from '../units';
import { CompareDetailQuerySchema, CompareDetailResponseSchema, CompareResponseSchema } from './compare';
import { API_PATHS, ErrorResponseSchema } from './common';
import { DashboardResponseSchema } from './dashboard';
import {
  AliasCreateSchema,
  IngredientCreateSchema,
  IngredientDetailResponseSchema,
  IngredientResponseSchema,
  IngredientsResponseSchema,
  IngredientUpdateSchema,
} from './ingredients';
import {
  ConfirmResultSchema,
  InvoiceConfirmSchema,
  InvoiceCreateResponseSchema,
  InvoiceDetailResponseSchema,
  InvoicesResponseSchema,
} from './invoices';
import { MenuDetailResponseSchema, MenuResponseSchema, MenuUpsertSchema, MenusResponseSchema } from './menus';
import {
  PurchaseCreateSchema,
  PurchaseListQuerySchema,
  PurchaseResponseSchema,
  PurchasesResponseSchema,
  PurchaseUpdateSchema,
} from './purchases';
import {
  CartResponseSchema,
  CartUpsertSchema,
  OrderReceiveResponseSchema,
  OrderReceiveSchema,
  OrderResponseSchema,
  OrdersResponseSchema,
  ProductsResponseSchema,
} from './shop';

const { ingredients, suppliers, purchases, menus, products, sales, demoInvoice, marketIndex } = seed;
const used = consumption(menus, ingredients, sales);
const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
const supplierName = (id: string) => suppliers.find((supplier) => supplier.id === id)!.name;
const pork = ingredientById.get('pork-shoulder')!;
const jeyuk = menus[0];
const invoice = demoInvoice;
const createdAt = '2026-10-31T00:00:00.000Z';

const menuWithCost = (menu: (typeof menus)[number]) => ({
  menu,
  cost: computeMenuCost(menu, ingredients, purchases, used),
  sold: soldByMenu(sales).get(menu.id) ?? 0,
});

const productWithSupplier = (product: (typeof products)[number]) => ({
  ...product,
  supplierName: supplierName(product.supplierId),
});

const demoOrder = () => {
  const built = buildOrder(
    [{ productId: 'product-milk-dairy-direct', quantity: 12 }],
    products,
  );
  return { id: 'order-1', status: 'placed' as const, isDemo: true as const, createdAt, ...built };
};

describe('response schemas parse seed-built examples', () => {
  it('dashboard', () => {
    const changes = priceChanges(ingredients, purchases, used).map((change) => {
      const ingredient = ingredientById.get(change.ingredientId)!;
      return {
        ingredientId: change.ingredientId,
        name: ingredient.name,
        baseUnit: ingredient.baseUnit,
        previousUnitPrice: change.previousUnitPrice,
        currentUnitPrice: change.currentUnitPrice,
        changeRate: change.changeRate,
        currentDate: change.currentDate,
      };
    });
    const parsed = DashboardResponseSchema.parse({
      month: '2026-10',
      monthIsCurrent: true,
      monthSpend: monthSpend(purchases, '2026-10'),
      purchaseCount: purchases.length,
      nextSettleDate: nextSettleDate(sales, '2026-10-31'),
      menus: menus.map(menuWithCost),
      priceChanges: changes,
      needsReview: [{
        invoiceId: invoice.id,
        supplier: invoice.extraction.supplier,
        date: invoice.date ?? null,
        itemCount: invoice.extraction.items.length,
        issueCount: 0,
        isDemo: invoice.isDemo,
      }],
      alert: costAlert(menus, ingredients, purchases, used),
    });
    expect(parsed.menus[0].cost.total).toBe(3200);
    expect(parsed.alert?.menuName).toBe('제육덮밥');
  });

  it('purchases list and single purchase', () => {
    const list = purchases.map((purchase) => {
      const ingredient = ingredientById.get(purchase.ingredientId)!;
      return {
        ...purchase,
        ingredientName: ingredient.name,
        supplierName: supplierName(purchase.supplierId),
        baseUnit: ingredient.baseUnit,
        unitPricePerBase: unitPricePerBase(purchase, ingredient.baseUnit),
      };
    });
    expect(PurchasesResponseSchema.parse({ purchases: list }).purchases).toHaveLength(purchases.length);
    expect(PurchaseResponseSchema.parse({ purchase: purchases[0] }).purchase.id).toBe(purchases[0].id);
  });

  it('ingredients list and detail', () => {
    const list = ingredients.map((ingredient) => {
      const { current } = currentAndPrevious(ingredient, purchases);
      return {
        ...ingredient,
        latest: current
          ? {
              unitPricePerBase: unitPricePerBase(current, ingredient.baseUnit),
              date: current.date,
              supplierId: current.supplierId,
            }
          : null,
        purchaseCount: purchases.filter((purchase) => purchase.ingredientId === ingredient.id).length,
      };
    });
    expect(IngredientsResponseSchema.parse({ ingredients: list }).ingredients).toHaveLength(ingredients.length);

    const history = purchases
      .filter((purchase) => purchase.ingredientId === pork.id)
      .map((purchase) => ({
        ...purchase,
        unitPricePerBase: unitPricePerBase(purchase, pork.baseUnit),
        supplierName: supplierName(purchase.supplierId),
      }));
    const { remaining, lots } = stockOf(pork, purchases, used.get(pork.id));
    const detail = IngredientDetailResponseSchema.parse({
      ingredient: pork,
      history,
      stock: { remaining, lots },
      menus: menus.filter((menu) => menu.recipe.some((line) => line.ingredientId === pork.id)),
      marketIndex: marketIndex[pork.id] ?? null,
    });
    expect(detail.history).toHaveLength(2);
    expect(detail.stock.lots.map((lot) => lot.remaining)).toEqual([0, 1600]);
    expect(IngredientDetailResponseSchema.parse({ ...detail, marketIndex: null }).marketIndex).toBeNull();
    expect(IngredientResponseSchema.parse({ ingredient: pork }).ingredient.aliases).toContain('돈앞다리');
  });

  it('menus list, detail and save', () => {
    expect(MenusResponseSchema.parse({ menus: menus.map(menuWithCost) }).menus).toHaveLength(4);
    const latte = menus[3];
    const cost = computeMenuCost(latte, ingredients, purchases);
    const detail = MenuDetailResponseSchema.parse({
      menu: latte,
      cost,
      sold: 10,
      stock: [{ ingredientId: 'milk', remaining: 9500, current: { date: '2026-10-30', unitPricePerBase: 2.8, remaining: 9500 }, next: null }],
      ingredients: latte.recipe.map((line) => ingredientById.get(line.ingredientId)),
      suppliers: suppliers.filter((supplier) => ['hanbit', 'coffee-lab'].includes(supplier.id)),
    });
    expect(detail.cost.total).toBe(1140);
    expect(MenuResponseSchema.parse({ menu: latte }).menu.servingLabel).toBe('1잔');
  });

  it('menu cost with an unpriced ingredient keeps nulls', () => {
    const cost = computeMenuCost(jeyuk, ingredients, purchases.filter((p) => p.ingredientId !== 'rice'));
    expect(cost.total).toBeNull();
    expect(MenusResponseSchema.parse({ menus: [{ menu: jeyuk, cost, sold: 0 }] }).menus[0].cost.missing).toEqual(['rice']);
  });

  it('invoices create, list, detail and confirm result', () => {
    expect(InvoiceCreateResponseSchema.parse({ invoice }).invoice.status).toBe('extracted');
    expect(InvoicesResponseSchema.parse({ invoices: [{ ...invoice, supplierName: '한우리축산' }] }).invoices).toHaveLength(1);

    const item = invoice.extraction.items[0];
    const current = currentAndPrevious(pork, purchases).current!;
    const detail = InvoiceDetailResponseSchema.parse({
      invoice,
      supplier: { id: 'hanuri', name: '한우리축산', registered: true },
      items: [{
        index: 0,
        item,
        suggestedIngredientId: pork.id,
        ingredientName: pork.name,
        baseUnit: pork.baseUnit,
        unitPricePerBase: item.amount / 10000,
        previousUnitPricePerBase: unitPricePerBase(current, pork.baseUnit),
        issues: [],
      }],
    });
    expect(detail.items[0].unitPricePerBase).toBe(9);

    const unregistered = InvoiceDetailResponseSchema.parse({
      invoice,
      supplier: { id: null, name: '새 거래처', registered: false },
      items: [{
        index: 0,
        item: { ...item, packSize: null, packUnit: null, confidence: 'low' },
        suggestedIngredientId: null,
        ingredientName: null,
        baseUnit: null,
        unitPricePerBase: null,
        previousUnitPricePerBase: null,
        issues: ['확인 필요'],
      }],
    });
    expect(unregistered.supplier.registered).toBe(false);

    const before = computeMenuCost(jeyuk, ingredients, purchases);
    const after = computeMenuCost(jeyuk, ingredients, [...purchases, {
      id: 'purchase-new',
      ingredientId: pork.id,
      supplierId: 'hanuri',
      date: '2026-10-31',
      packSize: 10,
      packUnit: 'kg',
      quantity: 1,
      amount: 90000,
      status: 'confirmed',
      source: 'receipt',
      invoiceId: invoice.id,
      rawName: item.rawName,
    }]);
    const result = ConfirmResultSchema.parse({
      purchases: [purchases[0]],
      changes: [{ menuId: jeyuk.id, menuName: jeyuk.name, before, after }],
    });
    expect(result.changes[0].after.total).toBe(3000);
  });

  it('compare list and detail', () => {
    const needed = 10000;
    const { offers, recommendedId } = compareOffers(
      pork,
      products.filter((product) => product.ingredientId === pork.id),
      needed,
    );
    const detail = CompareDetailResponseSchema.parse({
      ingredient: pork,
      neededBaseQty: needed,
      myLatest: { unitPricePerBase: 10, date: '2026-10-28', supplierName: '대성유통' },
      offers: offers.map((offer) => ({ ...offer, supplierName: supplierName(offer.product.supplierId) })),
      recommendedId,
      isDemo: true,
    });
    expect(detail.recommendedId).toBe('product-pork-shoulder-hanuri');
    expect(detail.offers.at(-1)?.reason).toBe('spec');

    const winner = detail.offers[0];
    expect(CompareResponseSchema.parse({
      items: [
        {
          ingredient: pork,
          latestUnitPrice: 10,
          offerCount: offers.length,
          recommended: { productId: winner.product.id, supplierName: winner.supplierName, total: winner.total },
        },
        { ingredient: ingredientById.get('rice')!, latestUnitPrice: 3, offerCount: 0, recommended: null },
      ],
    }).items).toHaveLength(2);
  });

  it('products, cart, orders and receive', () => {
    expect(ProductsResponseSchema.parse({
      products: products.map((product) => ({
        ...productWithSupplier(product),
        unitPricePerBase: product.price / (product.packSize * (product.packUnit === 'kg' || product.packUnit === 'L' ? 1000 : 1)),
      })),
      isDemo: true,
    }).products).toHaveLength(products.length);

    const milk = products.find((product) => product.id === 'product-milk-dairy-direct')!;
    const built = buildOrder([{ productId: milk.id, quantity: 12 }], products);
    const cart = CartResponseSchema.parse({
      items: [{ productId: milk.id, quantity: 12, product: productWithSupplier(milk) }],
      preview: { lines: built.lines, itemsTotal: built.itemsTotal, shippingTotal: built.shippingTotal, total: built.total },
    });
    expect(cart.preview.total).toBe(35200);

    const order = demoOrder();
    expect(OrdersResponseSchema.parse({ orders: [order] }).orders).toHaveLength(1);
    expect(OrderResponseSchema.parse({ order }).order.isDemo).toBe(true);

    const received = OrderReceiveResponseSchema.parse({
      order: { ...order, status: 'received', receivedAt: createdAt },
      purchases: [{
        id: 'purchase-from-order',
        ingredientId: 'milk',
        supplierId: 'dairy-direct',
        date: '2026-10-31',
        packSize: 1,
        packUnit: 'L',
        quantity: 12,
        amount: 31200,
        status: 'confirmed',
        source: 'order',
        orderLineId: order.lines[0].id,
      }],
    });
    expect(received.purchases[0].orderLineId).toBe(order.lines[0].id);
  });

  it('error response and path table', () => {
    expect(ErrorResponseSchema.parse({ error: '찾을 수 없습니다' }).error).toBe('찾을 수 없습니다');
    expect(API_PATHS.compareDetail).toContain('/api/compare/[ingredientId]');
  });
});

describe('request schemas reject invalid bodies', () => {
  const manual = {
    ingredientId: 'milk',
    supplierId: 'hanbit',
    date: '2026-10-31',
    packSize: 1,
    packUnit: 'L',
    quantity: 12,
    amount: 33600,
  };

  it('PurchaseCreate', () => {
    expect(PurchaseCreateSchema.safeParse(manual).success).toBe(true);
    expect(PurchaseCreateSchema.safeParse({ ...manual, supplierId: undefined, supplierName: '새 거래처' }).success).toBe(true);
    expect(PurchaseCreateSchema.safeParse({ ...manual, supplierName: '새 거래처' }).success).toBe(false);
    expect(PurchaseCreateSchema.safeParse({ ...manual, supplierId: undefined }).success).toBe(false);
    expect(PurchaseCreateSchema.safeParse({ ...manual, packUnit: 'oz' }).success).toBe(false);
    expect(PurchaseCreateSchema.safeParse({ ...manual, date: '2026-13-40' }).success).toBe(false);
  });

  it('PurchaseUpdate', () => {
    expect(PurchaseUpdateSchema.safeParse({ quantity: 6 }).success).toBe(true);
    expect(PurchaseUpdateSchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(PurchaseUpdateSchema.safeParse({ amount: 1000.5 }).success).toBe(false);
    expect(PurchaseUpdateSchema.safeParse({ supplierId: 'a', supplierName: 'b' }).success).toBe(false);
  });

  it('PurchaseListQuery', () => {
    expect(PurchaseListQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(PurchaseListQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false);
  });

  it('IngredientCreate, IngredientUpdate and AliasCreate', () => {
    expect(IngredientCreateSchema.safeParse({ name: '우유', baseUnit: 'mL' }).success).toBe(true);
    expect(IngredientCreateSchema.safeParse({ name: '우유', baseUnit: 'L' }).success).toBe(false);
    expect(IngredientCreateSchema.safeParse({ name: ' ', baseUnit: 'g' }).success).toBe(false);
    expect(IngredientUpdateSchema.safeParse({ baseUnit: 'kg' }).success).toBe(false);
    expect(AliasCreateSchema.safeParse({ alias: '' }).success).toBe(false);
  });

  it('MenuUpsert', () => {
    const valid = {
      name: '카페라테',
      price: 4500,
      servingLabel: '1잔',
      recipe: [
        { ingredientId: 'milk', amount: 250, unit: 'mL' },
        { ingredientId: 'coffee-beans', amount: 18, unit: 'g' },
      ],
    };
    expect(MenuUpsertSchema.safeParse(valid).success).toBe(true);
    expect(MenuUpsertSchema.safeParse({ ...valid, recipe: [] }).success).toBe(false);
    expect(MenuUpsertSchema.safeParse({ ...valid, recipe: [valid.recipe[0], valid.recipe[0]] }).success).toBe(false);
    expect(MenuUpsertSchema.safeParse({ ...valid, recipe: [{ ingredientId: 'milk', amount: 0, unit: 'mL' }] }).success).toBe(false);
    expect(MenuUpsertSchema.safeParse({ ...valid, servingLabel: '' }).success).toBe(false);
    expect(MenuUpsertSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
  });

  it('InvoiceConfirm', () => {
    const row = {
      ingredientId: 'pork-shoulder',
      rawName: '돼지고기 앞다리',
      packSize: 10,
      packUnit: 'kg',
      quantity: 1,
      amount: 90000,
      saveAlias: true,
    };
    const newIngredient = { name: '새 재료', baseUnit: 'g' };
    expect(InvoiceConfirmSchema.safeParse({ items: [row] }).success).toBe(true);
    expect(InvoiceConfirmSchema.safeParse({
      items: [{ ...row, ingredientId: undefined, newIngredient }],
    }).success).toBe(true);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, newIngredient }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, ingredientId: undefined }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, packSize: 0 }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, quantity: 0 }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, amount: 0 }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [{ ...row, saveAlias: undefined }] }).success).toBe(false);
    expect(InvoiceConfirmSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('CartUpsert, OrderReceive and CompareDetailQuery', () => {
    expect(CartUpsertSchema.safeParse({ productId: 'product-milk-hanbit', quantity: 2 }).success).toBe(true);
    expect(CartUpsertSchema.safeParse({ productId: 'product-milk-hanbit', quantity: 0 }).success).toBe(false);
    expect(CartUpsertSchema.safeParse({ productId: 'product-milk-hanbit', quantity: 1.5 }).success).toBe(false);
    expect(OrderReceiveSchema.safeParse({}).success).toBe(true);
    expect(OrderReceiveSchema.safeParse({ date: '2026-10-31' }).success).toBe(true);
    expect(OrderReceiveSchema.safeParse({ date: '10월 31일' }).success).toBe(false);
    expect(CompareDetailQuerySchema.parse({ need: '12000' }).need).toBe(12000);
    expect(CompareDetailQuerySchema.safeParse({ need: '-1' }).success).toBe(false);
  });
});
