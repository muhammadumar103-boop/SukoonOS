import { PageHeader } from "@/components/data-display/page-header";
import { DeferredAction } from "@/components/data-display/deferred-action";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { isDemoMode } from "@/config/runtime";
import { LocalDonationsManager } from "@/app/(app)/donations/local-donations-manager";
import { getDonationsPageData } from "@/server/queries/donations";

export default async function DonationsPage() {
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Donations"
          description="Record local demo donations with account funding, dual-currency values, receipts, filters, and ledger integration."
        />
        <LocalWorkspaceBanner />
        <LocalDonationsManager />
      </div>
    );
  }

  const { donations, summary } = await getDonationsPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Monitor incoming contributions, receipt status, fund allocation, and payment methods."
        action={<DeferredAction label="Coming in Milestone 4" />}
      />
      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-4 border-b border-emerald-100 p-5 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.monthTotal}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Average gift</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.averageGift}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Recurring donors</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.recurringDonors}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Donor</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Fund</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donations.map((donation) => (
                <tr key={donation.id}>
                  <td className="px-5 py-4 font-medium text-slate-950">{donation.donor}</td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{donation.amount}</td>
                  <td className="px-5 py-4 text-slate-500">{donation.method}</td>
                  <td className="px-5 py-4 text-slate-500">{donation.fund}</td>
                  <td className="px-5 py-4 text-slate-500">{donation.date}</td>
                  <td className="px-5 py-4"><StatusBadge value={donation.status} /></td>
                </tr>
              ))}
              {!donations.length ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={6}>
                    No donations have been recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
