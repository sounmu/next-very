import { getDb } from "../../../../db/client";
import { resetAndSeed } from "../../../../lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetAndSeed(getDb());
  return Response.json({ ok: true });
}
