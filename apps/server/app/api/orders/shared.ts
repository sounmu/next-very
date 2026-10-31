import type { Order } from "@marginlog/core";
import type { Db } from "../../../db/client";
import { loadOrders } from "../../../lib/repo";

/** One order with its lines, or null when the id is unknown. */
export async function loadOrder(db: Db, id: string): Promise<Order | null> {
  const all = await loadOrders(db);
  return all.find((o) => o.id === id) ?? null;
}
