import { BarChart3 } from "lucide-react";
import { DeferredAction } from "@/components/data-display/deferred-action";
import { PageHeader } from "@/components/data-display/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { getReports } from "@/server/queries/reports";

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Prepare finance summaries, impact reports, donor insights, and operational registers from live SukoonOS data."
        action={<DeferredAction label="Coming in Milestone 5" />}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <article key={report.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <BarChart3 className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950">{report.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Owner: {report.owner}</p>
                  </div>
                  <StatusBadge value={report.status} />
                </div>
                <p className="mt-5 text-sm text-slate-500">Last updated {report.updated}</p>
              </div>
            </div>
          </article>
        ))}
        {!reports.length ? <p className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500">No reports have been created yet.</p> : null}
      </section>
    </div>
  );
}
