export const requiredRuntimeEnv = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function hasRuntimeEnv() {
  return requiredRuntimeEnv.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export const isDemoMode = !hasRuntimeEnv();

export function getMissingRuntimeEnv() {
  return requiredRuntimeEnv.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}
