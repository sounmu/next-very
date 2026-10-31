import type { StoreInfo } from "@marginlog/core/src/api/auth";
import type { StoreRow } from "./auth";

export function toStoreInfo(row: StoreRow): StoreInfo {
  return { id: row.id, name: row.name, preset: row.preset, kind: row.kind, createdAt: row.createdAt.toISOString() };
}
