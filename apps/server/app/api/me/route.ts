import { MeResponseSchema } from "@marginlog/core/src/api/auth";
import { getDb } from "../../../db/client";
import { getAuth } from "../../../lib/auth";
import { toStoreInfo } from "../../../lib/storeInfo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuth(getDb(), request);
  if (!auth) return Response.json({ error: "로그인이 필요해요" }, { status: 401 });
  return Response.json(
    MeResponseSchema.parse({
      user: { id: auth.userId, email: auth.email },
      store: auth.store ? toStoreInfo(auth.store) : null,
    }),
  );
}
