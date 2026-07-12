import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, change, detail, icon: Icon }: MetricCardProps) {
  const positive = !change.startsWith("-");

  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={positive ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-slate-500"}>
          {change}
        </span>
        <span className="truncate text-sm text-slate-500">{detail}</span>
      </div>
    </div>
  );
}
