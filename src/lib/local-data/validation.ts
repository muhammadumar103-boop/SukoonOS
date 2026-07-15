import { z } from "zod";
import {
  localWorkspaceSchemaVersion,
  type LocalDonor,
  type LocalDonation,
  type LocalProject,
  type LocalTransfer,
  type LocalWorkspace,
} from "@/lib/local-data/schema";

const currencySchema = z.enum(["PKR", "USD"]);
const statusSchema = z.enum(["Active", "Review", "Paused"]);
const moneySchema = z.object({
  originalAmount: z.number(),
  originalCurrency: currencySchema,
  exchangeRate: z.number().positive(),
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
}) as z.ZodType<LocalDonation>;

export const localTransferSchema = moneySchema.extend({
  id: z.string().min(1),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  projectId: z.string(),
  project: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["Draft", "Review", "Scheduled", "Completed", "Cancelled"]),
  reference: z.string(),
  notes: z.string(),
}) as z.ZodType<LocalTransfer>;

export const localDonorSchema = z.object({
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

export const localProjectSchema = z.object({
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

export const localWorkspaceSchema = z.object({
  schemaVersion: z.literal(localWorkspaceSchemaVersion),
  sampleDataEnabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  financeAccounts: z.array(
    z.object({
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
    z.object({
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
  expenses: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().min(1),
      originalAmount: z.number(),
      originalCurrency: currencySchema,
      exchangeRate: z.number().positive(),
      category: z.string().min(1),
      projectId: z.string(),
      project: z.string().min(1),
      fundingAccountId: z.string().min(1),
      description: z.string(),
      paymentMethod: z.string(),
      paidBy: z.string(),
      receiptReference: z.string(),
      approvalStatus: z.enum(["Draft", "Pending", "Approved", "Paid", "Rejected"]),
      notes: z.string(),
    }),
  ),
  donations: z.array(localDonationSchema),
  transfers: z.array(localTransferSchema),
  projects: z.array(localProjectSchema),
  donors: z.array(localDonorSchema),
  tasks: z.array(z.any()),
  approvals: z.array(z.any()),
  reports: z.array(z.any()),
  auditLog: z.array(
    z.object({
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
