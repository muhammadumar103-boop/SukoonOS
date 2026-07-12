import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { isDemoMode } from "@/config/runtime";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-emerald-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex min-h-[38rem] items-center overflow-hidden px-6 py-12 sm:px-10 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.28),transparent_34%),linear-gradient(135deg,#022c22,#064e3b_55%,#0f172a)]" />
        <div className="relative max-w-xl">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-lg bg-white text-emerald-700">
              <HeartHandshake className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">SukoonOS</p>
              <p className="text-sm text-emerald-100">Operating system for Sukoon Charity</p>
            </div>
          </div>
          <h1 className="mt-14 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Run charity operations with clarity and care.
          </h1>
          <p className="mt-5 text-base leading-8 text-emerald-50">
            A calm workspace for finance, donors, projects, approvals, and impact reporting.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {["Donations", "Projects", "Reports"].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">{item}</p>
                <p className="mt-2 text-xs leading-5 text-emerald-100">Sample workspace ready</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-lg border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-950/10">
          <div>
            <p className="text-sm font-medium text-emerald-700">Welcome back</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Sign in to SukoonOS</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isDemoMode ? "Local demo mode is enabled. No credentials are required." : "Sign in with your Sukoon Charity account."}
            </p>
          </div>
          <LoginForm />
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link className="font-medium text-emerald-700" href="/">
              Open dashboard
            </Link>
            <span className="text-slate-400">Secure access</span>
          </div>
        </div>
      </section>
    </main>
  );
}
