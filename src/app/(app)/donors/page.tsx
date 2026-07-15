import { PageHeader } from "@/components/data-display/page-header";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { isDemoMode } from "@/config/runtime";
import { LocalDonorsManager } from "@/app/(app)/donors/local-donors-manager";
import { getDonorsPageData } from "@/server/queries/donors";

export default async function DonorsPage() {
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Donors CRM"
          description="Manage local donor records with derived giving history, reminders, and browser persistence in demo mode."
        />
        <LocalWorkspaceBanner />
        <LocalDonorsManager />
      </div>
    );
  }

  const { donors, summary } = await getDonorsPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donors CRM"
        description="A relationship-first view of donor health, giving history, contacts, and stewardship priority."
      />
      <section className="grid gap-4 xl:grid-cols-4">
        {summary.map((item) => {
          const { value, label } = item;
          return (
            <div key={label} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
              <p className="text-2xl font-semibold text-slate-950">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          );
        })}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {donors.map((donor) => (
          <article key={donor.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{donor.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{donor.type}</p>
              </div>
              <StatusBadge value={donor.health} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lifetime</p>
                <p className="mt-1 font-semibold text-slate-950">{donor.lifetime}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last gift</p>
                <p className="mt-1 font-semibold text-slate-950">{donor.lastGift}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contact</p>
                <p className="mt-1 truncate font-semibold text-slate-950">{donor.contact}</p>
              </div>
            </div>
          </article>
        ))}
        {!donors.length ? <p className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500">No donors have been created yet.</p> : null}
      </section>
    </div>
  );
}
