import {
  localExpenseStorageKey,
  localFinanceAccountsStorageKey,
  localFinanceBudgetsStorageKey,
} from "@/lib/finance/local-finance";
import { createEmptyWorkspace, createSampleWorkspace, migrateLocalWorkspace } from "@/lib/local-data/migrations";
import { localWorkspaceStorageKey, type LocalWorkspace } from "@/lib/local-data/schema";

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

export function loadLocalWorkspace(storage: BrowserStorage | null = browserStorage()): LocalWorkspace {
  if (!storage) {
    return createSampleWorkspace();
  }

  const legacy = readLegacyCollections(storage);
  const existing = safeParse(storage.getItem(localWorkspaceStorageKey));
  const workspace = existing ? migrateLocalWorkspace(existing, legacy) : createSampleWorkspace(legacy);

  storage.setItem(localWorkspaceStorageKey, JSON.stringify(workspace));
  syncLegacyCollections(storage, workspace);
  return workspace;
}

export function saveLocalWorkspace(workspace: LocalWorkspace, storage: BrowserStorage | null = browserStorage()) {
  const nextWorkspace = migrateLocalWorkspace({
    ...workspace,
    updatedAt: new Date().toISOString(),
  });

  if (storage) {
    storage.setItem(localWorkspaceStorageKey, JSON.stringify(nextWorkspace));
    syncLegacyCollections(storage, nextWorkspace);
  }

  return nextWorkspace;
}

export function resetLocalWorkspace(options: { sampleData: boolean }, storage: BrowserStorage | null = browserStorage()) {
  const workspace = options.sampleData ? createSampleWorkspace() : createEmptyWorkspace();
  if (storage) {
    storage.setItem(localWorkspaceStorageKey, JSON.stringify(workspace));
    syncLegacyCollections(storage, workspace);
  }

  return workspace;
}

export function clearLocalWorkspace(storage: BrowserStorage | null = browserStorage()) {
  storage?.removeItem(localWorkspaceStorageKey);
}
