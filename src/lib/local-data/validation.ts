import { z } from "zod";
import {
  type LocalApproval,
  localWorkspaceSchemaVersion,
  type LocalDonor,
  type LocalDonation,
  type LocalFinancialRecord,
  type LocalProject,
  type LocalReport,
  type LocalTask,
  type LocalTransfer,
  type LocalWorkspace,
} from "@/lib/local-data/schema";

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const currencySchema = z.enum(["PKR", "USD"]);
const statusSchema = z.enum(["Active", "Review", "Paused"]);
const localExpenseAttachmentSchema = strictObject({
  id: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative(),
  kind: z.enum(["Image", "PDF"]),
  storedAt: z.string().min(1),
});
const localExpenseSchema = strictObject({
  id: z.string().min(1),
  date: z.string().min(1),
  originalAmount: z.number().positive(),
  originalCurrency: currencySchema,
  exchangeRate: z.number().positive().finite(),
  category: z.string().min(1),
  projectId: z.string(),
  project: z.string().min(1),
  fundingAccountId: z.string().min(1),
  description: z.string(),
  paymentMethod: z.string(),
  paidBy: z.string(),
  receiptReference: z.string(),
  transferReference: z.string(),
  approvalStatus: z.enum(["Draft", "Pending", "Approved", "Paid", "Rejected", "Voided"]),
  proofNotes: z.string(),
  notes: z.string(),
  attachments: z.array(localExpenseAttachmentSchema),
});
const moneySchema = strictObject({
  originalAmount: z.number().positive(),
  originalCurrency: currencySchema,
  exchangeRate: z.number().positive().finite(),
  pkrAmount: z.number(),
  usdAmount: z.number(),
});

export const localDonationSchema = moneySchema.extend({
  id: z.string().min(1),
  donorId: z.string().min(1),
  donorName: z.string().min(1),
  projectId: z.string(),
  project: z.string().min(1),
  accountId: z.string().min(1),
  method: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["Pledged", "Processing", "Received", "Refunded", "Cancelled"]),
  receiptReference: z.string(),
  notes: z.string(),
}).strict() as z.ZodType<LocalDonation>;

export const localTransferSchema = moneySchema.extend({
  id: z.string().min(1),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  projectId: z.string(),
  project: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["Draft", "Review", "Scheduled", "Completed", "Cancelled", "Voided"]),
  reference: z.string(),
  notes: z.string(),
}).strict() as z.ZodType<LocalTransfer>;

export const localFinancialRecordSchema = moneySchema.extend({
  id: z.string().min(1),
  type: z.enum(["Refund", "Fee", "Adjustment"]),
  accountId: z.string().min(1),
  projectId: z.string(),
  project: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["Draft", "Pending", "Approved", "Posted", "Voided"]),
  description: z.string().min(1),
  party: z.string(),
  method: z.string().min(1),
  reference: z.string(),
  notes: z.string(),
}).strict() as z.ZodType<LocalFinancialRecord>;

export const localDonorSchema = strictObject({
  id: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  country: z.string(),
  preferredContactMethod: z.enum(["Phone", "WhatsApp", "Email"]),
  donorType: z.enum(["Individual", "Corporate", "Foundation", "Community"]),
  givingPreferences: z.array(z.string()),
  zakatPreference: z.string(),
  recurringDonor: z.boolean(),
  notes: z.string(),
  taxReceiptStatus: z.enum(["Not Required", "Pending", "Issued"]),
  updateHistory: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().min(1),
      summary: z.string(),
    }),
  ),
  nextUpdateDueDate: z.string(),
  reminderStatus: z.enum(["None", "Upcoming", "Overdue", "Completed"]),
}) as z.ZodType<LocalDonor>;

export const localProjectSchema = strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  projectType: z.string().min(1),
  location: z.string(),
  status: z.enum(["Planning", "Active", "Review", "Closing", "Completed", "Paused"]),
  startDate: z.string(),
  targetCompletionDate: z.string(),
  budgetPkr: z.number(),
  budgetUsd: z.number(),
  beneficiaries: z.number(),
  responsibleStaff: z.string(),
  progress: z.number(),
  notes: z.string(),
  timeline: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string(),
      title: z.string().min(1),
      notes: z.string(),
    }),
  ),
  mediaPlaceholders: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(["Photo", "Video"]),
      label: z.string().min(1),
    }),
  ),
  documentPlaceholders: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
  donorUpdates: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string(),
      title: z.string().min(1),
      notes: z.string(),
    }),
  ),
  completionReport: z.string(),
  archivedAt: z.string(),
}) as z.ZodType<LocalProject>;

export const localTaskSchema = strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  dueDate: z.string(),
  priority: z.enum(["Low", "Medium", "High"]),
  assignedUser: z.string().min(1),
  projectId: z.string(),
  status: z.enum(["Open", "In Progress", "Blocked", "Done"]),
}) as z.ZodType<LocalTask>;

export const localApprovalSchema = strictObject({
  id: z.string().min(1),
  sourceType: z.enum(["Expense", "Transfer", "Project Update"]),
  sourceId: z.string(),
  status: z.enum(["Pending", "Approved", "Rejected"]),
  requestedBy: z.string().min(1),
  requestedAt: z.string().min(1),
  reviewedBy: z.string(),
  reviewedAt: z.string(),
  notes: z.string(),
}) as z.ZodType<LocalApproval>;

export const localReportSchema = strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  reportType: z.string().min(1),
  filters: z.record(z.string()),
  updatedAt: z.string().min(1),
}) as z.ZodType<LocalReport>;

export const localWorkspaceSchema = strictObject({
  schemaVersion: z.literal(localWorkspaceSchemaVersion),
  sampleDataEnabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  financeAccounts: z.array(
    strictObject({
      id: z.string().min(1),
      name: z.string().min(1),
      kind: z.enum(["Bank", "Cash"]),
      currency: currencySchema,
      institution: z.string(),
      purpose: z.string(),
      openingBalance: z.number(),
      status: statusSchema,
    }),
  ),
  financeBudgets: z.array(
    strictObject({
      id: z.string().min(1),
      name: z.string().min(1),
      projectId: z.string(),
      project: z.string().min(1),
      category: z.string().min(1),
      period: z.enum(["Monthly", "Quarterly", "Annual"]),
      currency: currencySchema,
      amount: z.number(),
      owner: z.string(),
    }),
  ),
  expenses: z.array(localExpenseSchema),
  donations: z.array(localDonationSchema),
  transfers: z.array(localTransferSchema),
  financialRecords: z.array(localFinancialRecordSchema),
  projects: z.array(localProjectSchema),
  donors: z.array(localDonorSchema),
  tasks: z.array(localTaskSchema),
  approvals: z.array(localApprovalSchema),
  reports: z.array(localReportSchema),
  auditLog: z.array(
    strictObject({
      id: z.string().min(1),
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      action: z.string().min(1),
      actor: z.string().min(1),
      createdAt: z.string().min(1),
      metadata: z.record(z.unknown()),
    }),
  ),
  settings: z.record(z.unknown()),
}) as z.ZodType<LocalWorkspace>;
