import { getDb } from "../../../../db/client";
import { deleteSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** Ends the session of the bearer token. Succeeds without a token too. */
export async function POST(request: Request) {
  // Same header format getAuth reads.
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (token) await deleteSession(getDb(), token);
  return Response.json({ ok: true });
}
