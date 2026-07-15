"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Search, Trash2 } from "lucide-react";
import { z } from "zod";
import { StatusBadge } from "@/components/data-display/status-badge";
import { buildFinanceLedger } from "@/lib/finance/ledger";
import { formatMoney } from "@/lib/finance/local-finance";
import {
  deriveProjectRows,
  projectStatuses,
  projectTypes,
  type DerivedProjectRow,
} from "@/lib/local-data/projects";
import { appendAuditLogEntry, loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalProject, LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

const baseProjectSchema = z.object({
  name: z.string().min(2, "Project name is required."),
  projectType: z.string().min(1, "Project type is required."),
  location: z.string().min(2, "Location is required."),
  status: z.enum(projectStatuses),
  startDate: z.string().min(1, "Start date is required."),
  targetCompletionDate: z.string(),
  budgetPkr: z.number().min(0),
  budgetUsd: z.number().min(0),
  beneficiaries: z.number().min(0),
  responsibleStaff: z.string().min(2, "Responsible staff is required."),
  progress: z.number().min(0).max(100),
  notes: z.string(),
  timelineInput: z.string(),
  mediaInput: z.string(),
  documentInput: z.string(),
  donorUpdatesInput: z.string(),
  completionReport: z.string(),
});

type ProjectForm = z.infer<typeof baseProjectSchema>;

const emptyForm: ProjectForm = {
  name: "",
  projectType: projectTypes[0],
  location: "",
  status: "Planning",
  startDate: new Date().toISOString().slice(0, 10),
  targetCompletionDate: "",
  budgetPkr: 0,
  budgetUsd: 0,
  beneficiaries: 0,
  responsibleStaff: "",
  progress: 0,
  notes: "",
  timelineInput: "",
  mediaInput: "",
  documentInput: "",
  donorUpdatesInput: "",
  completionReport: "",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTimelineItems(input: string, prefix: string) {
  return parseLines(input).map((line, index) => {
    const [date = "", title = "", ...notesParts] = line.split("|").map((part) => part.trim());
    return {
      id: `${prefix}-timeline-${index + 1}`,
      date: date || new Date().toISOString().slice(0, 10),
      title: title || `Timeline item ${index + 1}`,
      notes: notesParts.join(" | "),
    };
  });
}

function serializeTimelineItems(items: LocalProject["timeline"]) {
  return items.map((item) => [item.date, item.title, item.notes].filter(Boolean).join(" | ")).join("\n");
}

function parseMediaItems(input: string, prefix: string) {
  return parseLines(input).map((line, index) => {
    const [type = "Photo", ...labelParts] = line.split("|").map((part) => part.trim());
    const normalizedType: "Photo" | "Video" = type === "Video" ? "Video" : "Photo";
    return {
      id: `${prefix}-media-${index + 1}`,
      type: normalizedType,
      label: labelParts.join(" | ") || `${normalizedType} placeholder ${index + 1}`,
    };
  });
}

function serializeMediaItems(items: LocalProject["mediaPlaceholders"]) {
  return items.map((item) => `${item.type} | ${item.label}`).join("\n");
}

function parseDocumentItems(input: string, prefix: string) {
  return parseLines(input).map((line, index) => ({
    id: `${prefix}-document-${index + 1}`,
    label: line,
  }));
}

function serializeDocumentItems(items: LocalProject["documentPlaceholders"]) {
  return items.map((item) => item.label).join("\n");
}

function parseDonorUpdates(input: string, prefix: string) {
  return parseLines(input).map((line, index) => {
    const [date = "", title = "", ...notesParts] = line.split("|").map((part) => part.trim());
    return {
      id: `${prefix}-update-${index + 1}`,
      date: date || new Date().toISOString().slice(0, 10),
      title: title || `Donor update ${index + 1}`,
      notes: notesParts.join(" | "),
    };
  });
}

function serializeDonorUpdates(items: LocalProject["donorUpdates"]) {
  return items.map((item) => [item.date, item.title, item.notes].filter(Boolean).join(" | ")).join("\n");
}

function projectToForm(project: LocalProject): ProjectForm {
  return {
    name: project.name,
    projectType: project.projectType,
    location: project.location,
    status: project.status,
    startDate: project.startDate,
    targetCompletionDate: project.targetCompletionDate,
    budgetPkr: project.budgetPkr,
    budgetUsd: project.budgetUsd,
    beneficiaries: project.beneficiaries,
    responsibleStaff: project.responsibleStaff,
    progress: project.progress,
    notes: project.notes,
    timelineInput: serializeTimelineItems(project.timeline),
    mediaInput: serializeMediaItems(project.mediaPlaceholders),
    documentInput: serializeDocumentItems(project.documentPlaceholders),
    donorUpdatesInput: serializeDonorUpdates(project.donorUpdates),
    completionReport: project.completionReport,
  };
}

export function LocalProjectsManager() {
  const workspaceRef = useRef<LocalWorkspace | null>(null);
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LocalProject["status"]>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | string>("All");
  const [viewFilter, setViewFilter] = useState<"Active" | "Archived" | "All">("Active");
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectForm, string>>>({});

  useEffect(() => {
    const loadedWorkspace = loadLocalWorkspace();
    workspaceRef.current = loadedWorkspace;
    setWorkspace(loadedWorkspace);
    const firstProject = loadedWorkspace.projects[0];
    setSelectedProjectId(firstProject?.id ?? "");
  }, []);

  const projectRows = useMemo(() => {
    if (!workspace) {
      return [];
    }

    return deriveProjectRows(workspace, buildFinanceLedger(workspace));
  }, [workspace]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projectRows.filter((project) => {
      const searchable = [
        project.name,
        project.projectType,
        project.location,
        project.status,
        project.responsibleStaff,
        project.notes,
        project.completionReport,
      ]
        .join(" ")
        .toLowerCase();

      const matchesArchiveState =
        viewFilter === "All" ? true : viewFilter === "Archived" ? Boolean(project.archivedAt) : !project.archivedAt;

      return (
        (!query || searchable.includes(query)) &&
        matchesArchiveState &&
        (statusFilter === "All" || project.status === statusFilter) &&
        (typeFilter === "All" || project.projectType === typeFilter)
      );
    });
  }, [projectRows, search, statusFilter, typeFilter, viewFilter]);

  const selectedProject = useMemo(() => {
    return filteredProjects.find((project) => project.id === selectedProjectId) ?? filteredProjects[0] ?? projectRows.find((project) => project.id === selectedProjectId) ?? null;
  }, [filteredProjects, projectRows, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects[0]) {
      setSelectedProjectId(filteredProjects[0].id);
      return;
    }

    if (selectedProjectId && !projectRows.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0]?.id ?? "");
    }
  }, [filteredProjects, projectRows, selectedProjectId]);

  function saveWorkspace(
    nextWorkspace: LocalWorkspace,
    audit: { action: string; entityId: string; metadata: Record<string, unknown> },
  ) {
    const auditedWorkspace = appendAuditLogEntry(nextWorkspace, {
      entityType: "project",
      entityId: audit.entityId,
      action: audit.action,
      actor: "Local Demo User",
      metadata: audit.metadata,
    });
    const savedWorkspace = saveLocalWorkspace(auditedWorkspace);
    workspaceRef.current = savedWorkspace;
    setWorkspace(savedWorkspace);
    return savedWorkspace;
  }

  function updateForm<Key extends keyof ProjectForm>(key: Key, value: ProjectForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  }

  function linkedCounts(project: LocalProject, currentWorkspace: LocalWorkspace) {
    return {
      budgets: currentWorkspace.financeBudgets.filter((budget) => budget.projectId === project.id).length,
      donations: currentWorkspace.donations.filter((donation) => donation.projectId === project.id).length,
      expenses: currentWorkspace.expenses.filter((expense) => expense.projectId === project.id).length,
      transfers: currentWorkspace.transfers.filter((transfer) => transfer.projectId === project.id).length,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceRef.current) {
      return;
    }

    const parsed = baseProjectSchema.safeParse({
      ...form,
      budgetPkr: Number(form.budgetPkr),
      budgetUsd: Number(form.budgetUsd),
      beneficiaries: Number(form.beneficiaries),
      progress: Number(form.progress),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        location: fieldErrors.location?.[0],
        responsibleStaff: fieldErrors.responsibleStaff?.[0],
        startDate: fieldErrors.startDate?.[0],
      });
      return;
    }

    const id = editingId ?? createId("project");
    const existingProject = workspaceRef.current.projects.find((project) => project.id === editingId);
    const nextProject: LocalProject = {
      id,
      name: parsed.data.name.trim(),
      projectType: parsed.data.projectType,
      location: parsed.data.location.trim(),
      status: parsed.data.status,
      startDate: parsed.data.startDate,
      targetCompletionDate: parsed.data.targetCompletionDate,
      budgetPkr: parsed.data.budgetPkr,
      budgetUsd: parsed.data.budgetUsd,
      beneficiaries: parsed.data.beneficiaries,
      responsibleStaff: parsed.data.responsibleStaff.trim(),
      progress: parsed.data.progress,
      notes: parsed.data.notes.trim(),
      timeline: parseTimelineItems(parsed.data.timelineInput, id),
      mediaPlaceholders: parseMediaItems(parsed.data.mediaInput, id),
      documentPlaceholders: parseDocumentItems(parsed.data.documentInput, id),
      donorUpdates: parseDonorUpdates(parsed.data.donorUpdatesInput, id),
      completionReport: parsed.data.completionReport.trim(),
      archivedAt: existingProject?.archivedAt ?? "",
    };

    const nextProjects = editingId
      ? workspaceRef.current.projects.map((project) => (project.id === editingId ? nextProject : project))
      : [nextProject, ...workspaceRef.current.projects];

    const saved = saveWorkspace(
      {
        ...workspaceRef.current,
        projects: nextProjects,
      },
      {
        action: editingId ? "updated" : "created",
        entityId: nextProject.id,
        metadata: {
          name: nextProject.name,
          archived: Boolean(nextProject.archivedAt),
          projectCount: nextProjects.length,
        },
      },
    );

    setSelectedProjectId(nextProject.id);
    workspaceRef.current = saved;
    resetForm();
  }

  function startEdit(project: LocalProject) {
    setForm(projectToForm(project));
    setEditingId(project.id);
    setSelectedProjectId(project.id);
    setErrors({});
  }

  function toggleArchive(project: LocalProject) {
    if (!workspaceRef.current) {
      return;
    }

    const actionLabel = project.archivedAt ? "restore" : "archive";
    const confirmed = window.confirm(`${project.archivedAt ? "Restore" : "Archive"} "${project.name}" in this browser workspace?`);
    if (!confirmed) {
      return;
    }

    const nextProjects = workspaceRef.current.projects.map((item) =>
      item.id === project.id
        ? {
            ...item,
            archivedAt: project.archivedAt ? "" : new Date().toISOString(),
          }
        : item,
    );

    saveWorkspace(
      {
        ...workspaceRef.current,
        projects: nextProjects,
      },
      {
        action: project.archivedAt ? "restored" : "archived",
        entityId: project.id,
        metadata: {
          name: project.name,
          action: actionLabel,
        },
      },
    );
  }

  function deleteProject(project: LocalProject) {
    if (!workspaceRef.current) {
      return;
    }

    const counts = linkedCounts(project, workspaceRef.current);
    const confirmed = window.confirm(
      `Delete "${project.name}" from this browser workspace?\n\nLinked records will keep the project name text as a legacy fallback, but the live project link will be removed.\n\nExpenses: ${counts.expenses}, Donations: ${counts.donations}, Transfers: ${counts.transfers}, Budgets: ${counts.budgets}`,
    );
    if (!confirmed) {
      return;
    }

    const nextWorkspace: LocalWorkspace = {
      ...workspaceRef.current,
      projects: workspaceRef.current.projects.filter((item) => item.id !== project.id),
      expenses: workspaceRef.current.expenses.map((expense) =>
        expense.projectId === project.id ? { ...expense, projectId: "", project: project.name } : expense,
      ),
      donations: workspaceRef.current.donations.map((donation) =>
        donation.projectId === project.id ? { ...donation, projectId: "", project: project.name } : donation,
      ),
      transfers: workspaceRef.current.transfers.map((transfer) =>
        transfer.projectId === project.id ? { ...transfer, projectId: "", project: project.name } : transfer,
      ),
      financeBudgets: workspaceRef.current.financeBudgets.map((budget) =>
        budget.projectId === project.id ? { ...budget, projectId: "", project: project.name } : budget,
      ),
    };

    saveWorkspace(nextWorkspace, {
      action: "deleted",
      entityId: project.id,
      metadata: {
        name: project.name,
        linkedBudgets: counts.budgets,
        linkedDonations: counts.donations,
        linkedExpenses: counts.expenses,
        linkedTransfers: counts.transfers,
      },
    });

    if (editingId === project.id) {
      resetForm();
    }
  }

  const projectTypeOptions = Array.from(projectTypes);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit project" : "Create project"}</h2>
          <p className="mt-1 text-sm text-slate-500">Projects use stable local IDs so finance records stay linked even if names change.</p>

          <div className="mt-5 grid gap-4">
            <Field label="Project name" error={errors.name}>
              <input className={inputClass} onChange={(event) => updateForm("name", event.target.value)} placeholder="Hospital Project" value={form.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project type">
                <select className={inputClass} onChange={(event) => updateForm("projectType", event.target.value)} value={form.projectType}>
                  {projectTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputClass} onChange={(event) => updateForm("status", event.target.value as LocalProject["status"])} value={form.status}>
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Location" error={errors.location}>
              <input className={inputClass} onChange={(event) => updateForm("location", event.target.value)} placeholder="Karachi, Pakistan" value={form.location} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" error={errors.startDate}>
                <input className={inputClass} onChange={(event) => updateForm("startDate", event.target.value)} type="date" value={form.startDate} />
              </Field>
              <Field label="Target completion">
                <input className={inputClass} onChange={(event) => updateForm("targetCompletionDate", event.target.value)} type="date" value={form.targetCompletionDate} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget PKR">
                <input className={inputClass} min="0" onChange={(event) => updateForm("budgetPkr", Number(event.target.value))} step="0.01" type="number" value={form.budgetPkr} />
              </Field>
              <Field label="Budget USD">
                <input className={inputClass} min="0" onChange={(event) => updateForm("budgetUsd", Number(event.target.value))} step="0.01" type="number" value={form.budgetUsd} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Beneficiaries">
                <input className={inputClass} min="0" onChange={(event) => updateForm("beneficiaries", Number(event.target.value))} step="1" type="number" value={form.beneficiaries} />
              </Field>
              <Field label="Progress">
                <input className={inputClass} max="100" min="0" onChange={(event) => updateForm("progress", Number(event.target.value))} step="1" type="number" value={form.progress} />
              </Field>
            </div>
            <Field label="Responsible staff" error={errors.responsibleStaff}>
              <input className={inputClass} onChange={(event) => updateForm("responsibleStaff", event.target.value)} placeholder="Ayesha Khan" value={form.responsibleStaff} />
            </Field>
            <Field label="Notes">
              <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Operational context, field notes, or donor concerns" value={form.notes} />
            </Field>
            <Field label="Timeline">
              <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => updateForm("timelineInput", event.target.value)} placeholder="2026-07-01 | Kickoff | Site team mobilized" value={form.timelineInput} />
            </Field>
            <Field label="Media placeholders">
              <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => updateForm("mediaInput", event.target.value)} placeholder="Photo | Construction progress&#10;Video | Donor update clip" value={form.mediaInput} />
            </Field>
            <Field label="Document placeholders">
              <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => updateForm("documentInput", event.target.value)} placeholder="Budget signoff pack&#10;Supplier agreement" value={form.documentInput} />
            </Field>
            <Field label="Donor updates">
              <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => updateForm("donorUpdatesInput", event.target.value)} placeholder="2026-07-05 | Donor note | Shared first beneficiary update" value={form.donorUpdatesInput} />
            </Field>
            <Field label="Completion report">
              <textarea className={cn(inputClass, "min-h-24 py-3")} onChange={(event) => updateForm("completionReport", event.target.value)} placeholder="Summarize outcomes, spend, and beneficiary impact." value={form.completionReport} />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800">
                {editingId ? "Save project" : "Create project"}
              </button>
              {editingId ? (
                <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetForm} type="button">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
            <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
              <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
                <Search className="size-4 text-slate-400" aria-hidden="true" />
                <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search project, location, type, staff..." value={search} />
              </div>
              <select className={inputClass} onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                <option value="All">All project types</option>
                {projectTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | LocalProject["status"])} value={statusFilter}>
                <option value="All">All statuses</option>
                {projectStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select className={inputClass} onChange={(event) => setViewFilter(event.target.value as "Active" | "Archived" | "All")} value={viewFilter}>
                <option value="Active">Active view</option>
                <option value="Archived">Archived only</option>
                <option value="All">All projects</option>
              </select>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {filteredProjects.map((project) => (
                <article key={project.id} className={cn("rounded-lg border p-5 transition", selectedProject?.id === project.id ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-white")}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <button className="text-left" onClick={() => setSelectedProjectId(project.id)} type="button">
                        <h2 className="text-lg font-semibold text-slate-950">{project.name}</h2>
                      </button>
                      <p className="mt-1 text-sm text-slate-500">{project.projectType} · {project.location}</p>
                    </div>
                    <StatusBadge value={project.archivedAt ? "Paused" : project.status} />
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Metric label="Budget" value={`${formatMoney(project.budgetPkr, "PKR")} / ${formatMoney(project.budgetUsd, "USD")}`} />
                    <Metric label="Expenses" value={`${formatMoney(project.expenseTotalPkr, "PKR")} / ${formatMoney(project.expenseTotalUsd, "USD")}`} />
                    <Metric label="Donations" value={`${formatMoney(project.donationTotalPkr, "PKR")} / ${formatMoney(project.donationTotalUsd, "USD")}`} />
                    <Metric label="Beneficiaries" value={project.beneficiaries.toLocaleString("en-US")} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Progress</span>
                    <span className="text-slate-500">{project.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => startEdit(project)} type="button">
                      <Pencil className="size-4" aria-hidden="true" />
                      <span className="sr-only">Edit project</span>
                    </button>
                    <button className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => toggleArchive(project)} type="button">
                      {project.archivedAt ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
                      <span className="sr-only">{project.archivedAt ? "Restore project" : "Archive project"}</span>
                    </button>
                    <button className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50" onClick={() => deleteProject(project)} type="button">
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">Delete project</span>
                    </button>
                  </div>
                </article>
              ))}
              {!filteredProjects.length ? <p className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500 lg:col-span-2">No projects match the current filters. Create a project or change the view.</p> : null}
            </div>
          </section>

          {selectedProject ? (
            <ProjectDetailCard project={selectedProject} onSelectEdit={() => startEdit(selectedProject)} workspace={workspace} />
          ) : (
            <section className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500 shadow-sm shadow-emerald-950/5">
              Create a project to begin linking budgets and finance activity.
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectDetailCard({
  project,
  onSelectEdit,
  workspace,
}: {
  project: DerivedProjectRow;
  onSelectEdit: () => void;
  workspace: LocalWorkspace | null;
}) {
  const relatedDonations = workspace?.donations.filter((donation) => donation.projectId === project.id).slice(0, 4) ?? [];
  const relatedExpenses = workspace?.expenses.filter((expense) => expense.projectId === project.id).slice(0, 4) ?? [];
  const relatedTransfers = workspace?.transfers.filter((transfer) => transfer.projectId === project.id).slice(0, 4) ?? [];

  return (
    <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{project.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{project.projectType} · {project.location} · {project.responsibleStaff || "No lead assigned"}</p>
        </div>
        <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onSelectEdit} type="button">
          Edit details
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Donations" value={`${formatMoney(project.donationTotalPkr, "PKR")} / ${formatMoney(project.donationTotalUsd, "USD")}`} />
        <MetricCard label="Expenses" value={`${formatMoney(project.expenseTotalPkr, "PKR")} / ${formatMoney(project.expenseTotalUsd, "USD")}`} />
        <MetricCard label="Transfers" value={`${formatMoney(project.transferTotalPkr, "PKR")} / ${formatMoney(project.transferTotalUsd, "USD")}`} />
        <MetricCard label="Remaining funds" value={`${formatMoney(project.remainingPkr, "PKR")} / ${formatMoney(project.remainingUsd, "USD")}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <InfoList
          title="Budgets"
          rows={project.budgetRows.map((budget) => ({
            title: budget.name,
            detail: `${budget.category} · ${budget.period}`,
            value: formatMoney(budget.amount, budget.currency),
          }))}
          emptyMessage="No budgets linked yet."
        />
        <InfoList
          title="Ledger activity"
          rows={project.ledgerActivity.slice(0, 6).map((entry) => ({
            title: entry.description,
            detail: `${entry.date} · ${entry.type} · ${entry.reference}`,
            value: entry.originalLabel,
          }))}
          emptyMessage="No linked ledger activity yet."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <InfoList
          title="Recent donations"
          rows={relatedDonations.map((donation) => ({
            title: donation.donorName,
            detail: `${donation.date} · ${donation.status}`,
            value: formatMoney(donation.originalAmount, donation.originalCurrency),
          }))}
          emptyMessage="No donations linked yet."
        />
        <InfoList
          title="Recent expenses"
          rows={relatedExpenses.map((expense) => ({
            title: expense.description,
            detail: `${expense.date} · ${expense.category}`,
            value: formatMoney(expense.originalAmount, expense.originalCurrency),
          }))}
          emptyMessage="No expenses linked yet."
        />
        <InfoList
          title="Recent transfers"
          rows={relatedTransfers.map((transfer) => ({
            title: transfer.reference || "Transfer",
            detail: `${transfer.date} · ${transfer.status}`,
            value: formatMoney(transfer.originalAmount, transfer.originalCurrency),
          }))}
          emptyMessage="No transfers linked yet."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TextSection title="Timeline" lines={project.timeline.map((item) => `${item.date} · ${item.title}${item.notes ? ` · ${item.notes}` : ""}`)} emptyMessage="No timeline items yet." />
        <TextSection title="Donor updates" lines={project.donorUpdates.map((item) => `${item.date} · ${item.title}${item.notes ? ` · ${item.notes}` : ""}`)} emptyMessage="No donor updates yet." />
        <TextSection title="Media placeholders" lines={project.mediaPlaceholders.map((item) => `${item.type} · ${item.label}`)} emptyMessage="No media placeholders yet." />
        <TextSection title="Document placeholders" lines={project.documentPlaceholders.map((item) => item.label)} emptyMessage="No document placeholders yet." />
      </div>

      <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">Completion report</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{project.completionReport || "No completion report recorded yet."}</p>
      </div>
    </section>
  );
}

function Field({
  children,
  className,
  error,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoList({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ title: string; detail: string; value: string }>;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row.title}-${row.detail}`} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900">{row.value}</p>
          </div>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

function TextSection({ title, lines, emptyMessage }: { title: string; lines: string[]; emptyMessage: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-4 space-y-2">
        {lines.length ? lines.map((line) => (
          <p key={`${title}-${line}`} className="text-sm leading-6 text-slate-600">{line}</p>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
