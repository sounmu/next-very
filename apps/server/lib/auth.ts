import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { sessions, stores, users } from "../db/schema";

export type StoreRow = typeof stores.$inferSelect;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Email-only login: creates the user on first login, then a new session. */
export async function createSession(
  db: Db,
  email: string,
): Promise<{ token: string; user: { id: string; email: string }; store: StoreRow | null }> {
  const normalized = normalizeEmail(email);
  const [user] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), email: normalized })
    // The no-op update makes RETURNING yield the existing row on conflict.
    .onConflictDoUpdate({ target: users.email, set: { email: normalized } })
    .returning({ id: users.id, email: users.email });
  if (!user) throw new Error("user upsert returned no row");
  const token = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
  await db.insert(sessions).values({ token, userId: user.id });
  const [store] = await db.select().from(stores).where(eq(stores.userId, user.id));
  return { token, user, store: store ?? null };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  return match?.[1] ?? null;
}

/** null when the request has no valid "Authorization: Bearer <token>" header. */
export async function getAuth(
  db: Db,
  request: Request,
): Promise<{ userId: string; email: string; store: StoreRow | null } | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const [row] = await db
    .select({ userId: users.id, email: users.email, store: stores })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(stores, eq(stores.userId, users.id))
    .where(eq(sessions.token, token));
  if (!row) return null;
  return { userId: row.userId, email: row.email, store: row.store ?? null };
}

/** The caller's store, or a 401 (not logged in) / 409 (no store yet) response to return as is. */
export async function requireStore(
  db: Db,
  request: Request,
): Promise<{ userId: string; storeId: string; store: StoreRow } | Response> {
  const auth = await getAuth(db, request);
  if (!auth) return Response.json({ error: "로그인이 필요해요" }, { status: 401 });
  if (!auth.store) return Response.json({ error: "가게 설정이 필요해요" }, { status: 409 });
  return { userId: auth.userId, storeId: auth.store.id, store: auth.store };
}
