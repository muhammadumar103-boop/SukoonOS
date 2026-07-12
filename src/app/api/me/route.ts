import { requireApiUser } from "@/server/auth/session";
import { ok } from "@/server/http/responses";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  return ok(auth.user);
}
