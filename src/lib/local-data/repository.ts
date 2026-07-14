import {
  localExpenseStorageKey,
  localFinanceAccountsStorageKey,
  localFinanceBudgetsStorageKey,
} from "@/lib/finance/local-finance";
import { createEmptyWorkspace, createSampleWorkspace, migrateLocalWorkspace } from "@/lib/local-data/migrations";
import {
  localWorkspaceBackupsStorageKey,
  localWorkspaceStorageKey,
  type LocalAuditLogEntry,
  type LocalWorkspace,
  type LocalWorkspaceBackup,
} from "@/lib/local-data/schema";
import { localWorkspaceSchema } from "@/lib/local-data/validation";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeParse(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function browserStorage(): BrowserStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLegacyCollections(storage: BrowserStorage) {
  const expenses = safeParse(storage.getItem(localExpenseStorageKey));
  const financeAccounts = safeParse(storage.getItem(localFinanceAccountsStorageKey));
  const financeBudgets = safeParse(storage.getItem(localFinanceBudgetsStorageKey));

  return {
    expenses: Array.isArray(expenses) ? expenses : undefined,
    financeAccounts: Array.isArray(financeAccounts) ? financeAccounts : undefined,
    financeBudgets: Array.isArray(financeBudgets) ? financeBudgets : undefined,
  };
}

function syncLegacyCollections(storage: BrowserStorage, workspace: LocalWorkspace) {
  storage.setItem(localExpenseStorageKey, JSON.stringify(workspace.expenses));
  storage.setItem(localFinanceAccountsStorageKey, JSON.stringify(workspace.financeAccounts));
  storage.setItem(localFinanceBudgetsStorageKey, JSON.stringify(workspace.financeBudgets));
}

function workspaceCounts(workspace: LocalWorkspace) {
  return {
    accounts: workspace.financeAccounts.length,
    budgets: workspace.financeBudgets.length,
    expenses: workspace.expenses.length,
    donations: workspace.donations.length,
    transfers: workspace.transfers.length,
    donors: workspace.donors.length,
  };
}

function readBackups(storage: BrowserStorage) {
  const backups = safeParse(storage.getItem(localWorkspaceBackupsStorageKey));
  return Array.isArray(backups) ? (backups as LocalWorkspaceBackup[]) : [];
}

function validateWorkspace(workspace: unknown) {
  return localWorkspaceSchema.parse(workspace);
}

export function appendAuditLogEntry(
  workspace: LocalWorkspace,
  entry: Omit<LocalAuditLogEntry, "id" | "createdAt">,
) {
  return {
    ...workspace,
    auditLog: [
      {
        id: createId(),
        createdAt: new Date().toISOString(),
        ...entry,
      },
      ...workspace.auditLog,
    ].slice(0, 200),
  };
}

export function loadLocalWorkspace(storage: BrowserStorage | null = browserStorage()): LocalWorkspace {
  if (!storage) {
    return createSampleWorkspace();
  }

  const legacy = readLegacyCollections(storage);
  const existing = safeParse(storage.getItem(localWorkspaceStorageKey));
  const workspace = validateWorkspace(existing ? migrateLocalWorkspace(existing, legacy) : createSampleWorkspace(legacy));

  storage.setItem(localWorkspaceStorageKey, JSON.stringify(workspace));
  syncLegacyCollections(storage, workspace);
  return workspace;
}

export function saveLocalWorkspace(workspace: LocalWorkspace, storage: BrowserStorage | null = browserStorage()) {
  const nextWorkspace = validateWorkspace(
    migrateLocalWorkspace({
      ...workspace,
      updatedAt: new Date().toISOString(),
    }),
  );

  if (storage) {
    storage.setItem(localWorkspaceStorageKey, JSON.stringify(nextWorkspace));
    syncLegacyCollections(storage, nextWorkspace);
  }

  return nextWorkspace;
}

export function createWorkspaceBackup(reason: string, storage: BrowserStorage | null = browserStorage()) {
  if (!storage) {
    return null;
  }

  const workspace = loadLocalWorkspace(storage);
  const backups = readBackups(storage);
  const nextBackup: LocalWorkspaceBackup = {
    id: `backup-${createId()}`,
    createdAt: new Date().toISOString(),
    reason,
    workspace,
  };

  storage.setItem(localWorkspaceBackupsStorageKey, JSON.stringify([nextBackup, ...backups].slice(0, 10)));
  return nextBackup;
}

export function exportLocalWorkspace(storage: BrowserStorage | null = browserStorage()) {
  const workspace = loadLocalWorkspace(storage);
  const audited = appendAuditLogEntry(workspace, {
    entityType: "workspace",
    entityId: "local",
    action: "exported",
    actor: "Local Demo User",
    metadata: workspaceCounts(workspace),
  });

  saveLocalWorkspace(audited, storage);
  return JSON.stringify(audited, null, 2);
}

export function importLocalWorkspace(input: string, storage: BrowserStorage | null = browserStorage()) {
  createWorkspaceBackup("import", storage);
  const parsed = JSON.parse(input) as unknown;
  const validated = validateWorkspace(migrateLocalWorkspace(parsed));
  const audited = appendAuditLogEntry(validated, {
    entityType: "workspace",
    entityId: "local",
    action: "imported",
    actor: "Local Demo User",
    metadata: workspaceCounts(validated),
  });

  return saveLocalWorkspace(audited, storage);
}

export function resetLocalWorkspace(options: { sampleData: boolean }, storage: BrowserStorage | null = browserStorage()) {
  createWorkspaceBackup(options.sampleData ? "reload-sample-data" : "clear-sample-data", storage);
  const workspace = options.sampleData ? createSampleWorkspace() : createEmptyWorkspace();
  const audited = appendAuditLogEntry(workspace, {
    entityType: "workspace",
    entityId: "local",
    action: options.sampleData ? "reloaded-sample-data" : "cleared-sample-data",
    actor: "Local Demo User",
    metadata: { sampleDataEnabled: options.sampleData },
  });

  if (storage) {
    storage.setItem(localWorkspaceStorageKey, JSON.stringify(audited));
    syncLegacyCollections(storage, audited);
  }

  return audited;
}

export function clearLocalWorkspace(storage: BrowserStorage | null = browserStorage()) {
  storage?.removeItem(localWorkspaceStorageKey);
}
