import type { Currency, FinanceAccount, FinanceBudget, LocalExpense } from "@/lib/finance/local-finance";

export const localWorkspaceStorageKey = "sukoonos.local.workspace.v1";
export const localWorkspaceSchemaVersion = 1;
export const localWorkspaceBackupsStorageKey = "sukoonos.local.workspace.backups.v1";

export type LocalTransactionType = "Donation" | "Expense" | "Transfer" | "Refund" | "Fee" | "Adjustment";

export type LocalMoney = {
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  pkrAmount: number;
  usdAmount: number;
};

export type LocalDonation = LocalMoney & {
  id: string;
  donorId: string;
  donorName: string;
  project: string;
  accountId: string;
  method: string;
  date: string;
  status: "Pledged" | "Processing" | "Received" | "Refunded" | "Cancelled";
  receiptReference: string;
  notes: string;
};

export type LocalTransfer = LocalMoney & {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  project: string;
  date: string;
  status: "Draft" | "Review" | "Scheduled" | "Completed" | "Cancelled";
  reference: string;
  notes: string;
};

export type LocalProject = {
  id: string;
  name: string;
  projectType: string;
  location: string;
  status: "Planning" | "Active" | "Review" | "Closing" | "Completed" | "Paused";
  startDate: string;
  targetCompletionDate: string;
  budgetPkr: number;
  budgetUsd: number;
  beneficiaries: number;
  responsibleStaff: string;
  progress: number;
  notes: string;
  timeline: Array<{ id: string; date: string; title: string; notes: string }>;
  mediaPlaceholders: Array<{ id: string; type: "Photo" | "Video"; label: string }>;
  documentPlaceholders: Array<{ id: string; label: string }>;
  donorUpdates: Array<{ id: string; date: string; title: string; notes: string }>;
  completionReport: string;
};

export type LocalDonor = {
  id: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  country: string;
  preferredContactMethod: "Phone" | "WhatsApp" | "Email";
  donorType: "Individual" | "Corporate" | "Foundation" | "Community";
  givingPreferences: string[];
  zakatPreference: string;
  recurringDonor: boolean;
  notes: string;
  taxReceiptStatus: "Not Required" | "Pending" | "Issued";
  updateHistory: Array<{ id: string; date: string; summary: string }>;
  nextUpdateDueDate: string;
  reminderStatus: "None" | "Upcoming" | "Overdue" | "Completed";
};

export type LocalTask = {
  id: string;
  title: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  assignedUser: string;
  projectId: string;
  status: "Open" | "In Progress" | "Blocked" | "Done";
};

export type LocalApproval = {
  id: string;
  sourceType: "Expense" | "Transfer" | "Project Update";
  sourceId: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedBy: string;
  requestedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  notes: string;
};

export type LocalReport = {
  id: string;
  name: string;
  reportType: string;
  filters: Record<string, string>;
  updatedAt: string;
};

export type LocalAuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type LocalWorkspaceBackup = {
  id: string;
  createdAt: string;
  reason: string;
  workspace: LocalWorkspace;
};

export type LocalWorkspace = {
  schemaVersion: typeof localWorkspaceSchemaVersion;
  sampleDataEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  financeAccounts: FinanceAccount[];
  financeBudgets: FinanceBudget[];
  expenses: LocalExpense[];
  donations: LocalDonation[];
  transfers: LocalTransfer[];
  projects: LocalProject[];
  donors: LocalDonor[];
  tasks: LocalTask[];
  approvals: LocalApproval[];
  reports: LocalReport[];
  auditLog: LocalAuditLogEntry[];
  settings: Record<string, unknown>;
};

export type LegacyLocalWorkspaceInput = Partial<LocalWorkspace> & {
  accounts?: FinanceAccount[];
  budgets?: FinanceBudget[];
};
