import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { PageHeader } from "@/components/data-display/page-header";
import { ProgressBar } from "@/components/data-display/progress-bar";
import { StatusBadge } from "@/components/data-display/status-badge";
import { isDemoMode } from "@/config/runtime";
import { LocalProjectsManager } from "@/app/(app)/projects/local-projects-manager";
import { getProjects } from "@/server/queries/dashboard";

export default async function ProjectsPage() {
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Create and manage local Sukoon projects with linked budgets, donations, expenses, transfers, and ledger activity."
        />
        <LocalWorkspaceBanner />
        <LocalProjectsManager />
      </div>
    );
  }

  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track program budgets, delivery progress, owners, and projects that need operational attention."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <article key={project.id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{project.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Lead: {project.lead}</p>
              </div>
              <StatusBadge value={project.status} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Budget</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{project.budget}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Spent</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{project.spent}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-slate-700">Delivery progress</span>
                <span className="text-slate-500">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} />
            </div>
          </article>
        ))}
        {!projects.length ? <p className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500">No projects have been created yet.</p> : null}
      </section>
    </div>
  );
}
