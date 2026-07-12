import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  value: string;
};

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Received: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Paid: "bg-slate-50 text-slate-700 ring-slate-200",
  Review: "bg-amber-50 text-amber-700 ring-amber-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  "At Risk": "bg-red-50 text-red-700 ring-red-200",
  Processing: "bg-teal-50 text-teal-700 ring-teal-200",
  Scheduled: "bg-teal-50 text-teal-700 ring-teal-200",
  Pending: "bg-orange-50 text-orange-700 ring-orange-200",
  Draft: "bg-slate-50 text-slate-700 ring-slate-200",
  New: "bg-lime-50 text-lime-700 ring-lime-200",
  Closing: "bg-slate-50 text-slate-700 ring-slate-200",
  Planning: "bg-slate-50 text-slate-700 ring-slate-200",
  Paused: "bg-slate-50 text-slate-700 ring-slate-200",
  Pledged: "bg-teal-50 text-teal-700 ring-teal-200",
  Refunded: "bg-slate-50 text-slate-700 ring-slate-200",
  Cancelled: "bg-red-50 text-red-700 ring-red-200",
  Rejected: "bg-red-50 text-red-700 ring-red-200",
  Archived: "bg-slate-50 text-slate-700 ring-slate-200",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[value] ?? "bg-slate-50 text-slate-700 ring-slate-200",
      )}
    >
      {value}
    </span>
  );
}
