export type Currency = "PKR" | "USD";

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Paid" | "Rejected" | "Voided";

export type AccountKind = "Bank" | "Cash";

export type FinanceAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: Currency;
  institution: string;
  purpose: string;
  openingBalance: number;
  status: "Active" | "Review" | "Paused";
};

export type BudgetPeriod = "Monthly" | "Quarterly" | "Annual";

export type ExpenseProofKind = "Image" | "PDF";

export type LocalExpenseAttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: ExpenseProofKind;
  storedAt: string;
};

export type FinanceBudget = {
  id: string;
  name: string;
  projectId: string;
  project: string;
  category: string;
  period: BudgetPeriod;
  currency: Currency;
  amount: number;
  owner: string;
};

export type LocalExpense = {
  id: string;
  date: string;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  category: string;
  projectId: string;
  project: string;
  fundingAccountId: string;
  description: string;
  paymentMethod: string;
  paidBy: string;
  receiptReference: string;
  transferReference: string;
  approvalStatus: ApprovalStatus;
  proofNotes: string;
  notes: string;
  attachments: LocalExpenseAttachmentMeta[];
};

export const localExpenseStorageKey = "sukoonos.local.expenses.v1";
export const localFinanceAccountsStorageKey = "sukoonos.local.finance.accounts.v1";
export const localFinanceBudgetsStorageKey = "sukoonos.local.finance.budgets.v1";

export const defaultUsdToPkrRate = 278;

export const expenseCategories = [
  "Transportation",
  "Salaries and Wages",
  "Utilities",
  "Rent",
  "Food",
  "Medical Supplies",
  "Construction Materials",
  "Fuel",
  "Bank and Transfer Fees",
  "Office Supplies",
  "Equipment",
  "Maintenance",
  "Other",
];

export const sukoonProjects = [
  "Hospital Project",
  "Water Well Program",
  "Orphan Sponsorship",
  "Food Parcels",
  "Daily Iftar",
  "Masjid Construction",
  "Widow Support",
  "General Operations",
];

export const paymentMethods = ["Cash", "Bank Transfer", "Card", "Cheque", "Mobile Wallet"];

export const approvalStatuses: ApprovalStatus[] = ["Draft", "Pending", "Approved", "Paid", "Rejected", "Voided"];

export const defaultFinanceAccounts: FinanceAccount[] = [
  {
    id: "main-donations-bank",
    name: "Main Donations Bank",
    kind: "Bank",
    currency: "USD",
    institution: "Sukoon International Account",
    purpose: "Major gifts and international donor receipts",
    openingBalance: 25000,
    status: "Active",
  },
  {
    id: "operations-bank-pkr",
    name: "Operations Bank PKR",
    kind: "Bank",
    currency: "PKR",
    institution: "Sukoon Pakistan Operations",
    purpose: "Vendor payments, payroll, and program operations",
    openingBalance: 2500000,
    status: "Active",
  },
  {
    id: "field-cash-pkr",
    name: "Field Cash PKR",
    kind: "Cash",
    currency: "PKR",
    institution: "Karachi Field Office",
    purpose: "On-site distributions and petty cash",
    openingBalance: 350000,
    status: "Review",
  },
  {
    id: "petty-cash-usd",
    name: "Petty Cash USD",
    kind: "Cash",
    currency: "USD",
    institution: "Finance Safe",
    purpose: "Small USD reimbursements and emergency float",
    openingBalance: 1200,
    status: "Active",
  },
];

export const defaultFinanceBudgets: FinanceBudget[] = [
  {
    id: "budget-hospital-medical",
    name: "Hospital medical supply reserve",
    projectId: "project-hospital",
    project: "Hospital Project",
    category: "Medical Supplies",
    period: "Monthly",
    currency: "PKR",
    amount: 1800000,
    owner: "Dr. Sameer Ali",
  },
  {
    id: "budget-food-parcels",
    name: "Food parcel distribution",
    projectId: "project-food-parcels",
    project: "Food Parcels",
    category: "Food",
    period: "Monthly",
    currency: "PKR",
    amount: 2400000,
    owner: "Mariam Khan",
  },
  {
    id: "budget-orphan-support",
    name: "Orphan sponsorship operations",
    projectId: "project-orphan-sponsorship",
    project: "Orphan Sponsorship",
    category: "Salaries and Wages",
    period: "Quarterly",
    currency: "USD",
    amount: 18000,
    owner: "Ayesha Noor",
  },
  {
    id: "budget-general-operations",
    name: "General operations overhead",
    projectId: "project-general-operations",
    project: "General Operations",
    category: "Utilities",
    period: "Monthly",
    currency: "PKR",
    amount: 650000,
    owner: "Bilal Ahmed",
  },
];

const categoryAliases: Record<string, string> = {
  "Food Relief": "Food",
  "Medical Aid": "Medical Supplies",
  Education: "Office Supplies",
  Transport: "Transportation",
  Operations: "Other",
  Emergency: "Other",
  "Salaries/Wages": "Salaries and Wages",
  "Bank/Transfer Fees": "Bank and Transfer Fees",
};

const projectAliases: Record<string, string> = {
  "Winter Relief 2026": "Food Parcels",
  "Mobile Medical Camp": "Hospital Project",
  "Orphan Education Fund": "Orphan Sponsorship",
  "Food Parcel Program": "Food Parcels",
};

export function normalizeExpenseCategory(category: string) {
  const normalized = categoryAliases[category] ?? category;
  return expenseCategories.includes(normalized) ? normalized : "Other";
}

export function normalizeSukoonProject(project: string) {
  const normalized = projectAliases[project] ?? project;
  return sukoonProjects.includes(normalized) ? normalized : "General Operations";
}

export function defaultFundingAccountId(paymentMethod: string, currency: Currency) {
  if (paymentMethod === "Cash") {
    return currency === "PKR" ? "field-cash-pkr" : "petty-cash-usd";
  }

  return currency === "PKR" ? "operations-bank-pkr" : "main-donations-bank";
}

type LegacyLocalExpense = Partial<LocalExpense> & {
  amount?: number;
  currency?: Currency;
};

export function normalizeLocalExpense(expense: LegacyLocalExpense): LocalExpense {
  const {
    amount: _legacyAmount,
    currency: _legacyCurrency,
    ...currentExpense
  } = expense;

  return {
    id: currentExpense.id ?? `expense-${Date.now()}`,
    date: currentExpense.date ?? new Date().toISOString().slice(0, 10),
    originalAmount: Number(currentExpense.originalAmount ?? _legacyAmount ?? 0),
    originalCurrency: currentExpense.originalCurrency ?? _legacyCurrency ?? "PKR",
    exchangeRate: Number(currentExpense.exchangeRate ?? defaultUsdToPkrRate),
    category: normalizeExpenseCategory(currentExpense.category ?? "Other"),
    projectId: currentExpense.projectId ?? "",
    project: normalizeSukoonProject(currentExpense.project ?? "General Operations"),
    fundingAccountId: currentExpense.fundingAccountId ?? defaultFundingAccountId(currentExpense.paymentMethod ?? paymentMethods[0], currentExpense.originalCurrency ?? _legacyCurrency ?? "PKR"),
    description: currentExpense.description ?? "",
    paymentMethod: currentExpense.paymentMethod ?? paymentMethods[0],
    paidBy: currentExpense.paidBy ?? "",
    receiptReference: currentExpense.receiptReference ?? "",
    transferReference: currentExpense.transferReference ?? "",
    approvalStatus: currentExpense.approvalStatus ?? "Pending",
    proofNotes: currentExpense.proofNotes ?? "",
    notes: currentExpense.notes ?? "",
    attachments: Array.isArray(currentExpense.attachments)
      ? currentExpense.attachments.map((attachment) => ({
          id: attachment.id ?? `attachment-${Date.now()}`,
          fileName: attachment.fileName ?? "Proof file",
          mimeType: attachment.mimeType ?? "application/octet-stream",
          sizeBytes: Number(attachment.sizeBytes ?? 0),
          kind: attachment.kind === "PDF" ? "PDF" : "Image",
          storedAt: attachment.storedAt ?? new Date().toISOString(),
        }))
      : [],
  };
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
}

export function parseMoney(value: string) {
  const numeric = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeFinanceAccount(account: Partial<FinanceAccount>): FinanceAccount {
  return {
    id: account.id ?? `account-${Date.now()}`,
    name: account.name ?? "New finance account",
    kind: account.kind ?? "Bank",
    currency: account.currency ?? "PKR",
    institution: account.institution ?? "",
    purpose: account.purpose ?? "",
    openingBalance: Number(account.openingBalance ?? 0),
    status: account.status ?? "Active",
  };
}

export function normalizeFinanceBudget(budget: Partial<FinanceBudget>): FinanceBudget {
  return {
    id: budget.id ?? `budget-${Date.now()}`,
    name: budget.name ?? "New budget",
    projectId: budget.projectId ?? "",
    project: normalizeSukoonProject(budget.project ?? "General Operations"),
    category: normalizeExpenseCategory(budget.category ?? "Other"),
    period: budget.period ?? "Monthly",
    currency: budget.currency ?? "PKR",
    amount: Number(budget.amount ?? 0),
    owner: budget.owner ?? "",
  };
}

export function convertedExpenseAmounts(expense: Pick<LocalExpense, "originalAmount" | "originalCurrency" | "exchangeRate">) {
  const rate = expense.exchangeRate > 0 ? expense.exchangeRate : defaultUsdToPkrRate;

  if (expense.originalCurrency === "PKR") {
    return {
      pkr: expense.originalAmount,
      usd: expense.originalAmount / rate,
      convertedCurrency: "USD" as const,
      convertedAmount: expense.originalAmount / rate,
    };
  }

  return {
    pkr: expense.originalAmount * rate,
    usd: expense.originalAmount,
    convertedCurrency: "PKR" as const,
    convertedAmount: expense.originalAmount * rate,
  };
}

export function originalExpenseLabel(expense: Pick<LocalExpense, "originalAmount" | "originalCurrency">) {
  return formatMoney(expense.originalAmount, expense.originalCurrency);
}

export function convertedExpenseLabel(expense: Pick<LocalExpense, "originalAmount" | "originalCurrency" | "exchangeRate">) {
  const amounts = convertedExpenseAmounts(expense);
  return formatMoney(amounts.convertedAmount, amounts.convertedCurrency);
}
