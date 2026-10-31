import type { Order } from "@marginlog/core";
import type { Db } from "../../../db/client";
import { loadOrders } from "../../../lib/repo";

/** One order with its lines, or null when the id is unknown or belongs to another store. */
export async function loadOrder(db: Db, storeId: string, id: string): Promise<Order | null> {
  const all = await loadOrders(db, storeId);
  return all.find((o) => o.id === id) ?? null;
}
