export type Currency = "PKR" | "USD";

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Paid" | "Rejected";

export type LocalExpense = {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
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

export function normalizeLocalExpense(expense: LocalExpense): LocalExpense {
  return {
    ...expense,
    category: normalizeExpenseCategory(expense.category),
    project: normalizeSukoonProject(expense.project),
  };
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
}
