import { LoginRequestSchema, LoginResponseSchema } from "@marginlog/core/src/api/auth";
import { getDb } from "../../../../db/client";
import { createSession } from "../../../../lib/auth";
import { toStoreInfo } from "../../../../lib/storeInfo";

export const dynamic = "force-dynamic";

/** Email-only login. The first login creates the user; there is no password. */
export async function POST(request: Request) {
  const parsed = LoginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "이메일 형식을 확인해 주세요" }, { status: 400 });

  const { token, user, store } = await createSession(getDb(), parsed.data.email);
  return Response.json(LoginResponseSchema.parse({ token, user, store: store ? toStoreInfo(store) : null }));
}
