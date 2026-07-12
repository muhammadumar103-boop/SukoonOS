import { isDemoMode } from "@/config/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/server/auth/session";
import { noContent } from "@/server/http/responses";
import { logActivity } from "@/server/services/logger";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  if (isDemoMode) {
    return noContent();
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await logActivity({
    type: "AUTH",
    action: "Signed out",
    message: `${auth.user.fullName} signed out.`,
    actor: auth.user,
  });

  return noContent();
}
