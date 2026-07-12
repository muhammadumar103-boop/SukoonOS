import { createBrowserClient } from "@supabase/ssr";
import { isDemoMode } from "@/config/runtime";

export function createSupabaseBrowserClient() {
  if (isDemoMode) {
    throw new Error("Supabase is not available in local demo mode.");
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
