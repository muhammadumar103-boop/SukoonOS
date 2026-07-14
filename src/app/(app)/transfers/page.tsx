import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/data-display/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { isDemoMode } from "@/config/runtime";
import { LocalTransfersManager } from "@/app/(app)/transfers/local-transfers-manager";
import { getTransfers } from "@/server/queries/transfers";

export default async function TransfersPage() {
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transfers"
          description="Move funds between Sukoon accounts locally in demo mode without counting transfers as income or expenses."
        />
        <LocalTransfersManager />
      </div>
    );
  }

  const transfers = await getTransfers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfers"
        description="Coordinate internal fund movement between charity accounts, reserves, programs, and field operations."
        action={<button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white">New transfer</button>}
      />
      <section className="space-y-4">
        {transfers.map((transfer) => (
          <article key={transfer.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{transfer.from}</p>
              </div>
              <div className="hidden size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 lg:grid">
                <ArrowRight className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">To</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{transfer.to}</p>
              </div>
              <div className="flex flex-col gap-2 lg:items-end">
                <p className="text-xl font-semibold text-slate-950">{transfer.amount}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{transfer.date}</span>
                  <StatusBadge value={transfer.status} />
                </div>
              </div>
            </div>
          </article>
        ))}
        {!transfers.length ? <p className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500">No transfers have been scheduled yet.</p> : null}
      </section>
    </div>
  );
}
