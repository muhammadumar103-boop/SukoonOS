import { Clock3, LifeBuoy, ShieldCheck, WalletCards } from "lucide-react";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { PageHeader } from "@/components/data-display/page-header";
import { isDemoMode } from "@/config/runtime";
import { requirePageRole } from "@/server/auth/session";
import { getSettingsSections } from "@/server/queries/settings";

const settingIcons = [LifeBuoy, ShieldCheck, WalletCards, Clock3];

export default async function SettingsPage() {
  if (isDemoMode) {
    const settingsSections = await getSettingsSections();

    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Review protected configuration areas for SukoonOS. Editing stays disabled in local demo mode."
        />
        <LocalWorkspaceBanner />
        <section className="grid gap-4 lg:grid-cols-2">
          {settingsSections.map((section, index) => {
            const Icon = settingIcons[index % settingIcons.length];

            return (
              <article key={section.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
                <div className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-semibold text-slate-950">{section.title}</h2>
                      <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                        Read-only in local demo
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {section.isSecret ? "Protected configuration" : "Managed application setting"} · {section.key}
                    </p>
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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-slate-950">{section.title}</h2>
                    <span className="inline-flex h-8 items-center rounded-md border border-emerald-100 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                      Managed in secure workspace
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {section.isSecret ? "Protected configuration" : "Managed application setting"} · {section.key}
                  </p>
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
