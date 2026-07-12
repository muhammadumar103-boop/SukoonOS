"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { isDemoMode } from "@/config/runtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      router.replace("/");
      router.refresh();
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <span className="mt-2 flex h-11 items-center gap-3 rounded-md border border-emerald-100 bg-white px-3">
          <Mail className="size-4 text-slate-400" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={isDemoMode ? "demo@sukoon.org" : "you@sukoon.org"}
            required={!isDemoMode}
            type="email"
            value={email}
          />
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <span className="mt-2 flex h-11 items-center gap-3 rounded-md border border-emerald-100 bg-white px-3">
          <LockKeyhole className="size-4 text-slate-400" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isDemoMode ? "Demo mode does not require a password" : "Enter your password"}
            required={!isDemoMode}
            type="password"
            value={password}
          />
        </span>
      </label>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button
        className="h-11 w-full rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {loading ? "Opening..." : isDemoMode ? "Open local demo" : "Sign in"}
      </button>
    </form>
  );
}
