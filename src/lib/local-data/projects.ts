import { convertedExpenseAmounts, type FinanceBudget } from "@/lib/finance/local-finance";
import type { FinanceLedgerEntry } from "@/lib/finance/ledger";
import type { LocalProject, LocalWorkspace } from "@/lib/local-data/schema";

export const projectTypes = [
  "Hospital",
  "Water Well",
  "Food Parcels",
  "Daily Iftar",
  "Orphan Sponsorship",
  "Widow Support",
  "Masjid Construction",
  "Emergency Aid",
  "Education",
  "General Operations",
] as const;

export const projectStatuses = ["Planning", "Active", "Review", "Closing", "Completed", "Paused"] as const;

type ProjectType = (typeof projectTypes)[number];

type ProjectReference = {
  project?: string;
  projectId?: string;
};

const sampleProjectSeeds: Array<{
  id: string;
  name: string;
  projectType: ProjectType;
  location: string;
  status: LocalProject["status"];
  startDate: string;
  targetCompletionDate: string;
  budgetPkr: number;
  budgetUsd: number;
  beneficiaries: number;
  responsibleStaff: string;
  progress: number;
  notes: string;
}> = [
  {
    id: "project-hospital",
    name: "Hospital Project",
    projectType: "Hospital",
    location: "Karachi, Pakistan",
    status: "Active",
    startDate: "2026-06-01",
    targetCompletionDate: "2026-12-15",
    budgetPkr: 18500000,
    budgetUsd: 66500,
    beneficiaries: 2400,
    responsibleStaff: "Dr. Sameer Ali",
    progress: 48,
    notes: "Focused on emergency medicines, diagnostic equipment, and ward readiness.",
  },
  {
    id: "project-food-parcels",
    name: "Food Parcels",
    projectType: "Food Parcels",
    location: "Karachi and Hyderabad",
    status: "Active",
    startDate: "2026-07-01",
    targetCompletionDate: "2026-08-31",
    budgetPkr: 12400000,
    budgetUsd: 44600,
    beneficiaries: 3200,
    responsibleStaff: "Mariam Khan",
    progress: 64,
    notes: "Monthly food parcel distribution for low-income households.",
  },
  {
    id: "project-orphan-sponsorship",
    name: "Orphan Sponsorship",
    projectType: "Orphan Sponsorship",
    location: "Lahore, Pakistan",
    status: "Review",
    startDate: "2026-05-15",
    targetCompletionDate: "2027-05-15",
    budgetPkr: 9700000,
    budgetUsd: 34900,
    beneficiaries: 185,
    responsibleStaff: "Ayesha Noor",
    progress: 52,
    notes: "Education and family support for sponsored children.",
  },
  {
    id: "project-daily-iftar",
    name: "Daily Iftar",
    projectType: "Daily Iftar",
    location: "Karachi, Pakistan",
    status: "Closing",
    startDate: "2026-03-01",
    targetCompletionDate: "2026-07-20",
    budgetPkr: 7200000,
    budgetUsd: 25900,
    beneficiaries: 5400,
    responsibleStaff: "Bilal Ahmed",
    progress: 92,
    notes: "Ramadan meal service with final vendor reconciliation underway.",
  },
  {
    id: "project-general-operations",
    name: "General Operations",
    projectType: "General Operations",
    location: "Karachi HQ",
    status: "Active",
    startDate: "2026-01-01",
    targetCompletionDate: "2026-12-31",
    budgetPkr: 5400000,
    budgetUsd: 19400,
    beneficiaries: 0,
    responsibleStaff: "Ayesha Khan",
    progress: 55,
    notes: "Shared operations, admin support, and central office costs.",
  },
];

export const sampleLocalProjects: LocalProject[] = sampleProjectSeeds.map((project, index) => ({
  ...project,
  timeline: [
    {
      id: `${project.id}-timeline-1`,
      date: project.startDate,
      title: "Kickoff",
      notes: `Operational setup completed for ${project.name}.`,
    },
    {
      id: `${project.id}-timeline-2`,
      date: project.targetCompletionDate,
      title: "Target completion",
      notes: "Current target completion milestone.",
    },
  ],
  mediaPlaceholders: [
    {
      id: `${project.id}-media-1`,
      type: "Photo",
      label: `${project.name} site photos`,
    },
    {
      id: `${project.id}-media-2`,
      type: "Video",
      label: `${project.name} donor update clip`,
    },
  ],
  documentPlaceholders: [
    {
      id: `${project.id}-document-1`,
      label: `${project.name} budget sheet`,
    },
    {
      id: `${project.id}-document-2`,
      label: `${project.name} approval pack`,
    },
  ],
  donorUpdates: [
    {
      id: `${project.id}-update-1`,
      date: project.startDate,
      title: "Launch note",
      notes: `${project.name} donor update prepared for the first progress cycle.`,
    },
  ],
  completionReport: index === 3 ? "Final beneficiary counts and supplier closeout will be summarized here." : "",
  archivedAt: "",
}));

const projectAliases: Record<string, string> = {
  "Food Parcel Program": "Food Parcels",
  "Field Operations": "General Operations",
  "Mobile Medical Camp": "Hospital Project",
  "Orphan Education Fund": "Orphan Sponsorship",
  "Winter Relief 2026": "Food Parcels",
};

export function slugifyProjectName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeProjectName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "General Operations";
  }

  return projectAliases[trimmed] ?? trimmed;
}

function inferProjectType(name: string): ProjectType {
  const normalized = normalizeProjectName(name).toLowerCase();

  if (normalized.includes("hospital") || normalized.includes("medical")) {
    return "Hospital";
  }
  if (normalized.includes("water")) {
    return "Water Well";
  }
  if (normalized.includes("food")) {
    return "Food Parcels";
  }
  if (normalized.includes("iftar")) {
    return "Daily Iftar";
  }
  if (normalized.includes("orphan")) {
    return "Orphan Sponsorship";
  }
  if (normalized.includes("widow")) {
    return "Widow Support";
  }
  if (normalized.includes("masjid")) {
    return "Masjid Construction";
  }
  if (normalized.includes("emergency")) {
    return "Emergency Aid";
  }
  if (normalized.includes("education")) {
    return "Education";
  }

  return "General Operations";
}

function inferLocation(name: string) {
  if (normalizeProjectName(name) === "General Operations") {
    return "Karachi HQ";
  }

  return "Pakistan";
}

export function createProjectId(name: string, existingIds: Set<string> = new Set()) {
  const base = `project-${slugifyProjectName(normalizeProjectName(name)) || "general-operations"}`;
  if (!existingIds.has(base)) {
    return base;
  }

  let index = 2;
  while (existingIds.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export function normalizeLocalProject(project: Partial<LocalProject>, existingIds: Set<string> = new Set()): LocalProject {
  const name = normalizeProjectName(project.name ?? "General Operations");
  const id = project.id?.trim() || createProjectId(name, existingIds);
  existingIds.add(id);

  return {
    id,
    name,
    projectType: projectTypes.includes((project.projectType ?? "") as ProjectType) ? (project.projectType as ProjectType) : inferProjectType(name),
    location: project.location?.trim() || inferLocation(name),
    status: projectStatuses.includes((project.status ?? "") as LocalProject["status"]) ? (project.status as LocalProject["status"]) : "Planning",
    startDate: project.startDate ?? new Date().toISOString().slice(0, 10),
    targetCompletionDate: project.targetCompletionDate ?? "",
    budgetPkr: Number(project.budgetPkr ?? 0),
    budgetUsd: Number(project.budgetUsd ?? 0),
    beneficiaries: Number(project.beneficiaries ?? 0),
    responsibleStaff: project.responsibleStaff?.trim() || "",
    progress: Math.max(0, Math.min(100, Number(project.progress ?? 0))),
    notes: project.notes?.trim() || "",
    timeline: Array.isArray(project.timeline) ? project.timeline : [],
    mediaPlaceholders: Array.isArray(project.mediaPlaceholders) ? project.mediaPlaceholders : [],
    documentPlaceholders: Array.isArray(project.documentPlaceholders) ? project.documentPlaceholders : [],
    donorUpdates: Array.isArray(project.donorUpdates) ? project.donorUpdates : [],
    completionReport: project.completionReport?.trim() || "",
    archivedAt: project.archivedAt ?? "",
  };
}

function createMigratedProject(name: string, existingIds: Set<string>) {
  return normalizeLocalProject(
    {
      name,
      projectType: inferProjectType(name),
      location: inferLocation(name),
      status: "Planning",
      startDate: new Date().toISOString().slice(0, 10),
      targetCompletionDate: "",
      notes: "Created automatically during legacy workspace migration to preserve linked finance records.",
    },
    existingIds,
  );
}

export function ensureWorkspaceProjects(projects: Partial<LocalProject>[], legacyNames: string[], sampleDataEnabled: boolean) {
  const seedSource = projects.length ? projects : sampleDataEnabled ? sampleLocalProjects : [];
  const ids = new Set<string>();
  const normalizedProjects = seedSource.map((project) => normalizeLocalProject(project, ids));

  const projectsById = new Map(normalizedProjects.map((project) => [project.id, project]));
  const projectsByName = new Map(normalizedProjects.map((project) => [normalizeProjectName(project.name), project]));

  for (const rawName of legacyNames) {
    const name = normalizeProjectName(rawName);
    if (!name) {
      continue;
    }

    if (projectsByName.has(name)) {
      continue;
    }

    const created = createMigratedProject(name, ids);
    normalizedProjects.push(created);
    projectsById.set(created.id, created);
    projectsByName.set(name, created);
  }

  return normalizedProjects.sort((left, right) => left.name.localeCompare(right.name));
}

export function findProjectByReference(projects: LocalProject[], reference: ProjectReference) {
  if (reference.projectId) {
    const byId = projects.find((project) => project.id === reference.projectId);
    if (byId) {
      return byId;
    }
  }

  if (!reference.project) {
    return undefined;
  }

  const normalizedName = normalizeProjectName(reference.project);
  return projects.find((project) => normalizeProjectName(project.name) === normalizedName);
}

export function resolveProjectReference(projects: LocalProject[], reference: ProjectReference) {
  const project = findProjectByReference(projects, reference);

  if (project) {
    return {
      projectId: project.id,
      project: reference.project?.trim() || project.name,
      projectName: project.name,
    };
  }

  const fallbackName = normalizeProjectName(reference.project ?? "General Operations");
  return {
    projectId: "",
    project: fallbackName,
    projectName: fallbackName,
  };
}

export function projectLabel(projects: LocalProject[], reference: ProjectReference) {
  return findProjectByReference(projects, reference)?.name ?? normalizeProjectName(reference.project ?? "General Operations");
}

export function recordMatchesProject(project: LocalProject, reference: ProjectReference) {
  if (reference.projectId) {
    return reference.projectId === project.id;
  }

  return normalizeProjectName(reference.project ?? "") === normalizeProjectName(project.name);
}

export function activeProjectOptions(projects: LocalProject[]) {
  return projects.filter((project) => !project.archivedAt).sort((left, right) => left.name.localeCompare(right.name));
}

export type DerivedProjectRow = LocalProject & {
  budgetRows: FinanceBudget[];
  donationCount: number;
  donationTotalPkr: number;
  donationTotalUsd: number;
  expenseCount: number;
  expenseTotalPkr: number;
  expenseTotalUsd: number;
  transferCount: number;
  transferTotalPkr: number;
  transferTotalUsd: number;
  budgetedPkr: number;
  budgetedUsd: number;
  remainingPkr: number;
  remainingUsd: number;
  ledgerActivity: FinanceLedgerEntry[];
};

export function deriveProjectRows(workspace: LocalWorkspace, ledgerEntries: FinanceLedgerEntry[]) {
  return workspace.projects.map((project) => {
    const donations = workspace.donations.filter((donation) => recordMatchesProject(project, donation));
    const expenses = workspace.expenses.filter((expense) => recordMatchesProject(project, expense));
    const transfers = workspace.transfers.filter((transfer) => recordMatchesProject(project, transfer));
    const budgetRows = workspace.financeBudgets.filter((budget) => recordMatchesProject(project, budget));
    const projectLedgerEntries = ledgerEntries.filter((entry) => recordMatchesProject(project, entry));

    const donationTotalPkr = donations.reduce((sum, donation) => sum + donation.pkrAmount, 0);
    const donationTotalUsd = donations.reduce((sum, donation) => sum + donation.usdAmount, 0);
    const expenseTotalPkr = expenses.reduce((sum, expense) => sum + convertedExpenseAmounts(expense).pkr, 0);
    const expenseTotalUsd = expenses.reduce((sum, expense) => sum + convertedExpenseAmounts(expense).usd, 0);
    const transferTotalPkr = transfers.reduce((sum, transfer) => sum + transfer.pkrAmount, 0);
    const transferTotalUsd = transfers.reduce((sum, transfer) => sum + transfer.usdAmount, 0);
    const budgetedPkr = budgetRows
      .filter((budget) => budget.currency === "PKR")
      .reduce((sum, budget) => sum + budget.amount, 0);
    const budgetedUsd = budgetRows
      .filter((budget) => budget.currency === "USD")
      .reduce((sum, budget) => sum + budget.amount, 0);

    return {
      ...project,
      budgetRows,
      donationCount: donations.length,
      donationTotalPkr,
      donationTotalUsd,
      expenseCount: expenses.length,
      expenseTotalPkr,
      expenseTotalUsd,
      transferCount: transfers.length,
      transferTotalPkr,
      transferTotalUsd,
      budgetedPkr,
      budgetedUsd,
      remainingPkr: budgetedPkr - expenseTotalPkr,
      remainingUsd: budgetedUsd - expenseTotalUsd,
      ledgerActivity: projectLedgerEntries,
    };
  });
}

export function linkedProjectNamesFromWorkspace(workspace: Pick<LocalWorkspace, "expenses" | "donations" | "transfers" | "financeBudgets" | "projects">) {
  return [
    ...workspace.expenses.map((expense) => expense.project),
    ...workspace.donations.map((donation) => donation.project),
    ...workspace.transfers.map((transfer) => transfer.project),
    ...workspace.financeBudgets.map((budget) => budget.project),
    ...workspace.projects.map((project) => project.name),
  ].filter(Boolean);
}
