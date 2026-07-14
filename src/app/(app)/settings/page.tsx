import { Clock3, LifeBuoy, ShieldCheck, WalletCards } from "lucide-react";
import { DeferredAction } from "@/components/data-display/deferred-action";
import { PageHeader } from "@/components/data-display/page-header";
import { requirePageRole } from "@/server/auth/session";
import { getSettingsSections } from "@/server/queries/settings";

const settingIcons = [LifeBuoy, ShieldCheck, WalletCards, Clock3];

export default async function SettingsPage() {
  await requirePageRole(["ADMIN"]);
  const settingsSections = await getSettingsSections();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure organization details, access controls, finance preferences, and workflow defaults."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {settingsSections.map((section, index) => {
          const Icon = settingIcons[index % settingIcons.length];

          return (
          <article key={section.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
                <div className="mt-5">
                  <DeferredAction label="Coming in Milestone 5" />
                </div>
              </div>
            </div>
          </article>
          );
        })}
        {!settingsSections.length ? <p className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500">No application settings have been configured yet.</p> : null}
      </section>
    </div>
  );
}
