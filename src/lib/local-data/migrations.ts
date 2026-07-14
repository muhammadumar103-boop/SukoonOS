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
  localWorkspaceSchemaVersion,
  type LegacyLocalWorkspaceInput,
  type LocalDonation,
  type LocalTransfer,
  type LocalWorkspace,
} from "@/lib/local-data/schema";

type LegacyCollections = {
  expenses?: unknown[];
  financeAccounts?: unknown[];
  financeBudgets?: unknown[];
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeExpenses(expenses: unknown[] | undefined): LocalExpense[] {
  return Array.isArray(expenses) ? expenses.map((expense) => normalizeLocalExpense(expense as Partial<LocalExpense>)) : [];
}

function normalizeAccounts(accounts: unknown[] | undefined): FinanceAccount[] {
  const source = Array.isArray(accounts) && accounts.length ? accounts : defaultFinanceAccounts;
  return source.map((account) => normalizeFinanceAccount(account as Partial<FinanceAccount>));
}

function normalizeBudgets(budgets: unknown[] | undefined): FinanceBudget[] {
  const source = Array.isArray(budgets) && budgets.length ? budgets : defaultFinanceBudgets;
  return source.map((budget) => normalizeFinanceBudget(budget as Partial<FinanceBudget>));
}

function normalizeDonations(donations: unknown[] | undefined): LocalDonation[] {
  return Array.isArray(donations) ? (donations as LocalDonation[]) : [];
}

function normalizeTransfers(transfers: unknown[] | undefined): LocalTransfer[] {
  return Array.isArray(transfers) ? (transfers as LocalTransfer[]) : [];
}

export function createEmptyWorkspace(): LocalWorkspace {
  const timestamp = nowIso();

  return {
    schemaVersion: localWorkspaceSchemaVersion,
    sampleDataEnabled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    financeAccounts: defaultFinanceAccounts.map(normalizeFinanceAccount),
    financeBudgets: [],
    expenses: [],
    donations: [],
    transfers: [],
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

  return {
    ...workspace,
    sampleDataEnabled: true,
    financeAccounts: normalizeAccounts(legacy.financeAccounts),
    financeBudgets: normalizeBudgets(legacy.financeBudgets),
    expenses: normalizeExpenses(legacy.expenses),
  };
}

export function migrateLocalWorkspace(input: unknown, legacy: LegacyCollections = {}): LocalWorkspace {
  const timestamp = nowIso();
  const candidate = (input && typeof input === "object" ? input : {}) as LegacyLocalWorkspaceInput;
  const existingExpenses = candidate.expenses?.length ? candidate.expenses : legacy.expenses;
  const existingAccounts = candidate.financeAccounts?.length ? candidate.financeAccounts : candidate.accounts ?? legacy.financeAccounts;
  const existingBudgets = candidate.financeBudgets?.length ? candidate.financeBudgets : candidate.budgets ?? legacy.financeBudgets;

  return {
    schemaVersion: localWorkspaceSchemaVersion,
    sampleDataEnabled: Boolean(candidate.sampleDataEnabled),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
    updatedAt: timestamp,
    financeAccounts: normalizeAccounts(existingAccounts),
    financeBudgets: normalizeBudgets(existingBudgets),
    expenses: normalizeExpenses(existingExpenses),
    donations: normalizeDonations(candidate.donations),
    transfers: normalizeTransfers(candidate.transfers),
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    donors: Array.isArray(candidate.donors) ? candidate.donors : [],
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    approvals: Array.isArray(candidate.approvals) ? candidate.approvals : [],
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
