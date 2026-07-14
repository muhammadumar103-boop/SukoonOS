export type Currency = "PKR" | "USD";

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Paid" | "Rejected";

export type LocalExpense = {
  id: string;
  date: string;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  category: string;
  project: string;
  description: string;
  paymentMethod: string;
  paidBy: string;
  receiptReference: string;
  approvalStatus: ApprovalStatus;
  notes: string;
};

export const localExpenseStorageKey = "sukoonos.local.expenses.v1";

export const defaultUsdToPkrRate = 278;

export const expenseCategories = [
  "Transportation",
  "Salaries/Wages",
  "Utilities",
  "Rent",
  "Food",
  "Medical Supplies",
  "Construction Materials",
  "Fuel",
  "Bank/Transfer Fees",
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

export const approvalStatuses: ApprovalStatus[] = ["Draft", "Pending", "Approved", "Paid", "Rejected"];

const categoryAliases: Record<string, string> = {
  "Food Relief": "Food",
  "Medical Aid": "Medical Supplies",
  Education: "Office Supplies",
  Transport: "Transportation",
  Operations: "Other",
  Emergency: "Other",
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
    project: normalizeSukoonProject(currentExpense.project ?? "General Operations"),
    description: currentExpense.description ?? "",
    paymentMethod: currentExpense.paymentMethod ?? paymentMethods[0],
    paidBy: currentExpense.paidBy ?? "",
    receiptReference: currentExpense.receiptReference ?? "",
    approvalStatus: currentExpense.approvalStatus ?? "Pending",
    notes: currentExpense.notes ?? "",
  };
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
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
