import { ArrowDownLeft, ArrowRightLeft, BadgeDollarSign, CheckCircle2, CreditCard, HandHeart, Landmark } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { LocalDashboard } from "@/app/(app)/local-dashboard";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { MetricCard } from "@/components/data-display/metric-card";
import { PageHeader } from "@/components/data-display/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { isDemoMode } from "@/config/runtime";
import { getDashboardData } from "@/server/queries/dashboard";

const metricIcons = {
  bank: Landmark,
  donations: BadgeDollarSign,
  expenses: CreditCard,
  projects: HandHeart,
};

const activityIcons = {
  AUTH: CheckCircle2,
  PROJECT: CheckCircle2,
  DONATION: ArrowDownLeft,
  DONOR: CheckCircle2,
  EXPENSE: CreditCard,
  TRANSFER: ArrowRightLeft,
  REPORT: CheckCircle2,
  SETTING: CheckCircle2,
  TASK: CheckCircle2,
};

export default async function DashboardPage() {
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Live local operations view for balances, giving, spending, approvals, reminders, and task follow-up."
          action={
            <Link className="inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800" href="/donations">
              New donation
            </Link>
          }
        />
        <LocalWorkspaceBanner />
        <LocalDashboard />
      </div>
    );
  }

  const { stats, donationTrend, expenseBreakdown, fundsDeployedPercent, recentActivity, todaysTasks } = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A live-feeling operational overview for donations, funds, projects, approvals, and team priorities."
        action={
          <Link className="inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800" href="/donations">
            New donation
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} icon={metricIcons[stat.icon as keyof typeof metricIcons]} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Donation momentum</h2>
              <p className="mt-1 text-sm text-slate-500">Monthly giving trend from live donations.</p>
            </div>
            <StatusBadge value="Strong" />
          </div>
          <div className="mt-5">
            <BarChart data={donationTrend} />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Expense allocation</h2>
          <p className="mt-1 text-sm text-slate-500">Current program spend distribution.</p>
          <div className="mt-6">
            <DonutChart value={fundsDeployedPercent} label="Monthly funds deployed" />
          </div>
          <div className="mt-6 space-y-4">
            {expenseBreakdown.length ? expenseBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No approved expenses have been recorded yet.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Recent activity</h2>
          <div className="mt-5 space-y-4">
            {recentActivity.length ? recentActivity.map((activity) => {
              const Icon = activityIcons[activity.type as keyof typeof activityIcons] ?? CheckCircle2;

              return (
              <div key={activity.id} className="flex gap-4 rounded-lg border border-slate-100 p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-950">{activity.title}</p>
                    <p className="text-xs font-medium text-slate-400">{activity.time}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{activity.description}</p>
                </div>
              </div>
              );
            }) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No activity has been logged yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h2 className="text-base font-semibold text-slate-950">Today&apos;s tasks</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysTasks.map((task) => (
                  <tr key={task.id} className="bg-white">
                    <td className="px-4 py-4 font-medium text-slate-900">{task.task}</td>
                    <td className="px-4 py-4 text-slate-500">{task.owner}</td>
                    <td className="px-4 py-4">
                      <StatusBadge value={task.priority === "High" ? "Pending" : task.priority === "Low" ? "Draft" : "Processing"} />
                    </td>
                  </tr>
                ))}
                {!todaysTasks.length ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>
                      No open tasks for today.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
