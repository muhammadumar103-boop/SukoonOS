import {
  convertedExpenseAmounts,
  defaultFinanceAccounts,
  defaultFinanceBudgets,
  normalizeFinanceAccount,
  normalizeFinanceBudget,
  normalizeLocalExpense,
  type FinanceAccount,
  type FinanceBudget,
  type LocalExpense,
} from "@/lib/finance/local-finance";
import {
  ensureWorkspaceProjects,
  linkedProjectNamesFromWorkspace,
  resolveProjectReference,
  sampleLocalProjects,
} from "@/lib/local-data/projects";
import { resolveDonorReference } from "@/lib/local-data/donors";
import {
  localWorkspaceSchemaVersion,
  type LocalApproval,
  type LegacyLocalWorkspaceInput,
  type LocalDonation,
  type LocalDonor,
  type LocalFinancialRecord,
  type LocalProject,
  type LocalTask,
  type LocalTransfer,
  type LocalWorkspace,
} from "@/lib/local-data/schema";
import {
  sampleLocalApprovals,
  sampleLocalDonations,
  sampleLocalDonors,
  sampleLocalFinancialRecords,
  sampleLocalTasks,
  sampleLocalTransfers,
} from "@/lib/local-data/seeds";

type LegacyCollections = {
  expenses?: unknown[];
  financeAccounts?: unknown[];
  financeBudgets?: unknown[];
};

type NormalizeCollectionOptions = {
  fallbackToDefaults?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function hasArrayValue(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function normalizeAccounts(accounts: unknown[] | undefined, options: NormalizeCollectionOptions = {}): FinanceAccount[] {
  const source = hasArrayValue(accounts) ? accounts : options.fallbackToDefaults ? defaultFinanceAccounts : [];
  return source.map((account) => normalizeFinanceAccount(account as Partial<FinanceAccount>));
}

function normalizeProjects(projects: unknown[] | undefined, legacyNames: string[], sampleDataEnabled: boolean) {
  return ensureWorkspaceProjects(
    Array.isArray(projects) ? (projects as Partial<LocalProject>[]) : [],
    legacyNames,
    sampleDataEnabled,
  );
}

function normalizeExpenses(expenses: unknown[] | undefined, projects: LocalProject[]): LocalExpense[] {
  return Array.isArray(expenses)
    ? expenses.map((expense) => {
        const normalized = normalizeLocalExpense(expense as Partial<LocalExpense>);
        const projectReference = resolveProjectReference(projects, normalized);

        return {
          ...normalized,
          projectId: projectReference.projectId,
          project: projectReference.project,
        };
      })
    : [];
}

function normalizeBudgets(
  budgets: unknown[] | undefined,
  projects: LocalProject[],
  options: NormalizeCollectionOptions = {},
): FinanceBudget[] {
  const source = hasArrayValue(budgets) ? budgets : options.fallbackToDefaults ? defaultFinanceBudgets : [];
  return source.map((budget) => {
    const normalized = normalizeFinanceBudget(budget as Partial<FinanceBudget>);
    const projectReference = resolveProjectReference(projects, normalized);

    return {
      ...normalized,
      projectId: projectReference.projectId,
      project: projectReference.project,
    };
  });
}

function normalizeDonations(donations: unknown[] | undefined, projects: LocalProject[], donors: LocalDonor[]): LocalDonation[] {
  return Array.isArray(donations)
    ? donations.map((donation) => {
        const candidate = donation as Partial<LocalDonation>;
        const projectReference = resolveProjectReference(projects, candidate);
        const donorReference = resolveDonorReference(donors, candidate);

        return {
          id: candidate.id ?? `donation-${Date.now()}`,
          donorId: donorReference.donorId,
          donorName: donorReference.donorName,
          projectId: projectReference.projectId,
          project: projectReference.project,
          accountId: candidate.accountId ?? "main-donations-bank",
          method: candidate.method ?? "Bank Transfer",
          date: candidate.date ?? new Date().toISOString().slice(0, 10),
          status: candidate.status ?? "Received",
          receiptReference: candidate.receiptReference ?? "",
          notes: candidate.notes ?? "",
          ...moneyValues(Number(candidate.originalAmount ?? 0), candidate.originalCurrency ?? "USD", Number(candidate.exchangeRate ?? 278)),
        };
      })
    : [];
}

function normalizeTransfers(transfers: unknown[] | undefined, projects: LocalProject[]): LocalTransfer[] {
  return Array.isArray(transfers)
    ? transfers.map((transfer) => {
        const candidate = transfer as Partial<LocalTransfer>;
        const projectReference = resolveProjectReference(projects, candidate);

        return {
          id: candidate.id ?? `transfer-${Date.now()}`,
          fromAccountId: candidate.fromAccountId ?? "main-donations-bank",
          toAccountId: candidate.toAccountId ?? "operations-bank-pkr",
          projectId: projectReference.projectId,
          project: projectReference.project,
          date: candidate.date ?? new Date().toISOString().slice(0, 10),
          status: candidate.status ?? "Review",
          reference: candidate.reference ?? "",
          notes: candidate.notes ?? "",
          ...moneyValues(Number(candidate.originalAmount ?? 0), candidate.originalCurrency ?? "USD", Number(candidate.exchangeRate ?? 278)),
        };
      })
    : [];
}

function normalizeFinancialRecords(records: unknown[] | undefined, projects: LocalProject[]): LocalFinancialRecord[] {
  return Array.isArray(records)
    ? records.map((record) => {
        const candidate = record as Partial<LocalFinancialRecord>;
        const projectReference = resolveProjectReference(projects, candidate);

        return {
          id: candidate.id ?? `financial-record-${Date.now()}`,
          type: candidate.type === "Refund" || candidate.type === "Fee" || candidate.type === "Adjustment" ? candidate.type : "Adjustment",
          accountId: candidate.accountId ?? "operations-bank-pkr",
          projectId: projectReference.projectId,
          project: projectReference.project,
          date: candidate.date ?? new Date().toISOString().slice(0, 10),
          status:
            candidate.status === "Draft" ||
            candidate.status === "Pending" ||
            candidate.status === "Approved" ||
            candidate.status === "Posted" ||
            candidate.status === "Voided"
              ? candidate.status
              : "Draft",
          description: candidate.description?.trim() || "",
          party: candidate.party?.trim() || "",
          method: candidate.method?.trim() || (candidate.type === "Adjustment" ? "Adjustment" : "Bank Transfer"),
          reference: candidate.reference?.trim() || "",
          notes: candidate.notes?.trim() || "",
          ...moneyValues(Number(candidate.originalAmount ?? 0), candidate.originalCurrency ?? "USD", Number(candidate.exchangeRate ?? 278)),
        };
      })
    : [];
}

function normalizeDonors(donors: unknown[] | undefined): LocalDonor[] {
  return Array.isArray(donors) ? (donors as LocalDonor[]) : [];
}

function normalizeTasks(tasks: unknown[] | undefined): LocalTask[] {
  return Array.isArray(tasks)
    ? tasks.map((task, index) => {
        const candidate = task as Partial<LocalTask>;
        return {
          id: candidate.id ?? `task-${Date.now()}-${index + 1}`,
          title: candidate.title?.trim() || "Untitled task",
          dueDate: candidate.dueDate ?? "",
          priority: candidate.priority === "Low" || candidate.priority === "Medium" || candidate.priority === "High" ? candidate.priority : "Medium",
          assignedUser: candidate.assignedUser?.trim() || "Unassigned",
          projectId: candidate.projectId ?? "",
          status:
            candidate.status === "Open" || candidate.status === "In Progress" || candidate.status === "Blocked" || candidate.status === "Done"
              ? candidate.status
              : "Open",
        };
      })
    : [];
}

function normalizeApprovals(approvals: unknown[] | undefined): LocalApproval[] {
  return Array.isArray(approvals)
    ? approvals.map((approval, index) => {
        const candidate = approval as Partial<LocalApproval>;
        return {
          id: candidate.id ?? `approval-${Date.now()}-${index + 1}`,
          sourceType:
            candidate.sourceType === "Expense" || candidate.sourceType === "Transfer" || candidate.sourceType === "Project Update"
              ? candidate.sourceType
              : "Project Update",
          sourceId: candidate.sourceId?.trim() || "",
          status: candidate.status === "Pending" || candidate.status === "Approved" || candidate.status === "Rejected" ? candidate.status : "Pending",
          requestedBy: candidate.requestedBy?.trim() || "Local Demo User",
          requestedAt: candidate.requestedAt ?? new Date().toISOString().slice(0, 10),
          reviewedBy: candidate.reviewedBy?.trim() || "",
          reviewedAt: candidate.reviewedAt ?? "",
          notes: candidate.notes?.trim() || "",
        };
      })
    : [];
}

function collectLegacyProjectNames(
  candidate: LegacyLocalWorkspaceInput,
  legacy: LegacyCollections,
  sampleDataEnabled: boolean,
) {
  const candidateBudgets = legacy.financeBudgets ?? candidate.financeBudgets ?? candidate.budgets;
  const provisionalWorkspace: Pick<LocalWorkspace, "expenses" | "donations" | "transfers" | "financeBudgets" | "projects"> = {
    expenses: hasArrayValue(legacy.expenses ?? candidate.expenses) ? ((legacy.expenses ?? candidate.expenses) as LocalExpense[]) : [],
    donations: hasArrayValue(candidate.donations) ? (candidate.donations as LocalDonation[]) : sampleDataEnabled ? sampleLocalDonations : [],
    transfers: hasArrayValue(candidate.transfers) ? (candidate.transfers as LocalTransfer[]) : sampleDataEnabled ? sampleLocalTransfers : [],
    financeBudgets: hasArrayValue(candidateBudgets)
      ? (candidateBudgets as FinanceBudget[])
      : sampleDataEnabled
        ? defaultFinanceBudgets
        : [],
    projects: hasArrayValue(candidate.projects)
      ? ((candidate.projects as LocalProject[]).map((project) => ({ ...project, archivedAt: project.archivedAt ?? "" })) as LocalProject[])
      : sampleDataEnabled
        ? sampleLocalProjects
        : [],
  };

  return linkedProjectNamesFromWorkspace(provisionalWorkspace);
}

function isLegacyClearedWorkspace(candidate: LegacyLocalWorkspaceInput) {
  const auditLog = Array.isArray(candidate.auditLog) ? candidate.auditLog : [];
  const latestAction = auditLog[0]?.action;

  return (
    !candidate.sampleDataEnabled &&
    latestAction === "cleared-sample-data" &&
    !candidate.donations?.length &&
    !candidate.expenses?.length &&
    !candidate.transfers?.length &&
    !candidate.financialRecords?.length &&
    !candidate.donors?.length &&
    !candidate.tasks?.length &&
    !candidate.approvals?.length &&
    !candidate.reports?.length
  );
}

export function createEmptyWorkspace(): LocalWorkspace {
  const timestamp = nowIso();

  return {
    schemaVersion: localWorkspaceSchemaVersion,
    sampleDataEnabled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    financeAccounts: [],
    financeBudgets: [],
    expenses: [],
    donations: [],
    transfers: [],
    financialRecords: [],
    projects: [],
    donors: [],
    tasks: [],
    approvals: [],
    reports: [],
    auditLog: [],
    settings: {},
  };
}

export function createSampleWorkspace(legacy: LegacyCollections = {}): LocalWorkspace {
  const workspace = createEmptyWorkspace();
  const donors = normalizeDonors(sampleLocalDonors);
  const projects = normalizeProjects(
    sampleLocalProjects,
    linkedProjectNamesFromWorkspace({
      expenses: Array.isArray(legacy.expenses) ? (legacy.expenses as LocalExpense[]) : [],
      donations: sampleLocalDonations,
      transfers: sampleLocalTransfers,
      financeBudgets: Array.isArray(legacy.financeBudgets) ? (legacy.financeBudgets as FinanceBudget[]) : defaultFinanceBudgets,
      projects: sampleLocalProjects,
    }),
    true,
  );

  return {
    ...workspace,
    sampleDataEnabled: true,
    financeAccounts: normalizeAccounts(legacy.financeAccounts, { fallbackToDefaults: true }),
    financeBudgets: normalizeBudgets(legacy.financeBudgets, projects, { fallbackToDefaults: true }),
    expenses: normalizeExpenses(legacy.expenses, projects),
    donations: normalizeDonations(sampleLocalDonations, projects, donors),
    transfers: normalizeTransfers(sampleLocalTransfers, projects),
    financialRecords: normalizeFinancialRecords(sampleLocalFinancialRecords, projects),
    projects,
    donors,
    tasks: normalizeTasks(sampleLocalTasks),
    approvals: normalizeApprovals(sampleLocalApprovals),
  };
}

export function migrateLocalWorkspace(input: unknown, legacy: LegacyCollections = {}): LocalWorkspace {
  const timestamp = nowIso();
  const rawCandidate = (input && typeof input === "object" ? input : {}) as LegacyLocalWorkspaceInput;
  const candidate = isLegacyClearedWorkspace(rawCandidate)
    ? {
        ...rawCandidate,
        financeAccounts: [],
        financeBudgets: [],
        projects: [],
      }
    : rawCandidate;
  const existingExpenses = legacy.expenses ?? candidate.expenses;
  const existingAccounts = legacy.financeAccounts ?? candidate.financeAccounts ?? candidate.accounts;
  const existingBudgets = legacy.financeBudgets ?? candidate.financeBudgets ?? candidate.budgets;
  const hasExplicitAccounts = hasArrayValue(legacy.financeAccounts) || hasArrayValue(candidate.financeAccounts) || hasArrayValue(candidate.accounts);
  const hasExplicitBudgets = hasArrayValue(legacy.financeBudgets) || hasArrayValue(candidate.financeBudgets) || hasArrayValue(candidate.budgets);
  const sampleDataEnabled = Boolean(candidate.sampleDataEnabled);
  const existingDonations = candidate.donations?.length ? candidate.donations : sampleDataEnabled ? sampleLocalDonations : [];
  const existingTransfers = candidate.transfers?.length ? candidate.transfers : sampleDataEnabled ? sampleLocalTransfers : [];
  const existingFinancialRecords =
    candidate.financialRecords?.length ? candidate.financialRecords : sampleDataEnabled ? sampleLocalFinancialRecords : [];
  const donors = normalizeDonors(candidate.donors?.length ? candidate.donors : sampleDataEnabled ? sampleLocalDonors : []);
  const projects = normalizeProjects(candidate.projects, collectLegacyProjectNames(candidate, legacy, sampleDataEnabled), sampleDataEnabled);

  return {
    schemaVersion: localWorkspaceSchemaVersion,
    sampleDataEnabled,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
    updatedAt: timestamp,
    financeAccounts: normalizeAccounts(existingAccounts, { fallbackToDefaults: sampleDataEnabled || !hasExplicitAccounts }),
    financeBudgets: normalizeBudgets(existingBudgets, projects, { fallbackToDefaults: sampleDataEnabled || !hasExplicitBudgets }),
    expenses: normalizeExpenses(existingExpenses, projects),
    donations: normalizeDonations(existingDonations, projects, donors),
    transfers: normalizeTransfers(existingTransfers, projects),
    financialRecords: normalizeFinancialRecords(existingFinancialRecords, projects),
    projects,
    donors,
    tasks: normalizeTasks(candidate.tasks?.length ? candidate.tasks : sampleDataEnabled ? sampleLocalTasks : []),
    approvals: normalizeApprovals(candidate.approvals?.length ? candidate.approvals : sampleDataEnabled ? sampleLocalApprovals : []),
    reports: Array.isArray(candidate.reports) ? candidate.reports : [],
    auditLog: Array.isArray(candidate.auditLog) ? candidate.auditLog : [],
    settings: candidate.settings && typeof candidate.settings === "object" ? candidate.settings : {},
  };
}

export function moneyValues(amount: number, currency: "PKR" | "USD", exchangeRate: number) {
  const values = convertedExpenseAmounts({
    originalAmount: amount,
    originalCurrency: currency,
    exchangeRate,
  });

  return {
    originalAmount: amount,
    originalCurrency: currency,
    exchangeRate,
    pkrAmount: values.pkr,
    usdAmount: values.usd,
  };
}
