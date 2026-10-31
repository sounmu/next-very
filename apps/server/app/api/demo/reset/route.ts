import { getDb } from "../../../../db/client";
import { requireStore } from "../../../../lib/auth";
import { resetOwnStore, resetShowcaseStore } from "../../../../lib/seed";

export const dynamic = "force-dynamic";

/** Puts the caller's store back to its preset. Other stores are never touched. */
export async function POST(request: Request) {
  const db = getDb();
  const auth = await requireStore(db, request);
  if (auth instanceof Response) return auth;
  if (auth.store.kind === "showcase") await resetShowcaseStore(db);
  else await resetOwnStore(db, auth.store);
  return Response.json({ ok: true });
}
