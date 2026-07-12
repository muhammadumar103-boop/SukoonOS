import { z } from "zod";

const cents = z.coerce.number().int().min(0);
const optionalDate = z.coerce.date().optional().nullable();

export const projectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  leadName: z.string().min(2).max(120),
  budgetCents: cents.default(0),
  spentCents: cents.default(0),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(["PLANNING", "ACTIVE", "REVIEW", "CLOSING", "COMPLETED", "PAUSED"]).default("PLANNING"),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const donorSchema = z.object({
  name: z.string().min(2).max(160),
  type: z.enum(["INDIVIDUAL", "CORPORATE", "FOUNDATION", "COMMUNITY"]).default("INDIVIDUAL"),
  health: z.enum(["NEW", "STRONG", "WATCH", "AT_RISK"]).default("NEW"),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  contactName: z.string().max(160).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const donationSchema = z.object({
  donorId: z.string().min(1),
  projectId: z.string().min(1).optional().nullable(),
  amountCents: cents,
  method: z.string().min(2).max(80),
  fund: z.string().min(2).max(120),
  status: z.enum(["PLEDGED", "PROCESSING", "RECEIVED", "REFUNDED", "CANCELLED"]).default("PROCESSING"),
  receivedAt: z.coerce.date().default(() => new Date()),
  receiptCode: z.string().max(80).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const expenseSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  vendor: z.string().min(2).max(160),
  category: z.string().min(2).max(120),
  amountCents: cents,
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "PAID", "REJECTED"]).default("PENDING"),
  submittedAt: z.coerce.date().default(() => new Date()),
  approvedAt: optionalDate,
  paidAt: optionalDate,
  notes: z.string().max(4000).optional().nullable(),
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amountCents: cents,
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "COMPLETED", "CANCELLED"]).default("REVIEW"),
  scheduledFor: optionalDate,
  completedAt: optionalDate,
  notes: z.string().max(4000).optional().nullable(),
});

export const reportSchema = z.object({
  name: z.string().min(2).max(160),
  owner: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "REVIEW", "READY", "ARCHIVED"]).default("DRAFT"),
  periodStart: optionalDate,
  periodEnd: optionalDate,
  payload: z.record(z.unknown()).optional().nullable(),
});

export const settingSchema = z.object({
  key: z.string().min(2).max(120).regex(/^[a-z0-9_.-]+$/),
  label: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  value: z.unknown(),
  isSecret: z.boolean().default(false),
});

export const idSchema = z.object({
  id: z.string().min(1),
});
