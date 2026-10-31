import type { CartItem, Order, OrderLine, SupplierProduct } from './types';

let orderSequence = 0;

/** Cart references and positive integer quantities are validated at the API boundary. */
export function buildOrder(
  cartItems: readonly CartItem[],
  products: readonly SupplierProduct[],
): Pick<Order, 'lines' | 'itemsTotal' | 'shippingTotal' | 'total'> {
  const linePrefix = `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${orderSequence++}`;
  const shippingBySupplier = new Map<string, number>();
  const lines = cartItems.map((item, index): OrderLine => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new RangeError(`Unknown cart product: ${item.productId}`);
    shippingBySupplier.set(product.supplierId,
      Math.max(shippingBySupplier.get(product.supplierId) ?? 0, product.shippingFee));
    return {
      id: `${linePrefix}-${index}`,
      productId: product.id,
      supplierId: product.supplierId,
      ingredientId: product.ingredientId,
      name: product.name,
      packSize: product.packSize,
      packUnit: product.packUnit,
      quantity: item.quantity,
      price: product.price,
      amount: product.price * item.quantity,
    };
  });
  const itemsTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const shippingTotal = [...shippingBySupplier.values()].reduce((sum, fee) => sum + fee, 0);
  return { lines, itemsTotal, shippingTotal, total: itemsTotal + shippingTotal };
}
