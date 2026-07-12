import { prisma } from "@/lib/prisma/client";
import type { AuthenticatedUser } from "@/server/auth/session";
import { logActivity } from "@/server/services/logger";
import {
  donationSchema,
  donorSchema,
  expenseSchema,
  projectSchema,
  reportSchema,
  settingSchema,
  transferSchema,
} from "@/server/validation/schemas";

type ResourceName = "project" | "donor" | "donation" | "expense" | "transfer" | "report" | "setting";

async function logMutation(resource: ResourceName, action: string, id: string, actor: AuthenticatedUser) {
  const type = resource === "setting" ? "SETTING" : resource.toUpperCase();
  await logActivity({
    type: type as "PROJECT" | "DONOR" | "DONATION" | "EXPENSE" | "TRANSFER" | "REPORT" | "SETTING",
    action,
    message: `${actor.fullName} ${action.toLowerCase()} ${resource} ${id}.`,
    actor,
    metadata: { resource, id },
  });
}

export const resourceService = {
  projects: {
    list: () => prisma.project.findMany({ orderBy: { updatedAt: "desc" } }),
    get: (id: string) => prisma.project.findUniqueOrThrow({ where: { id } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.project.create({ data: projectSchema.parse(input) });
      await logMutation("project", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.project.update({ where: { id }, data: projectSchema.partial().parse(input) });
      await logMutation("project", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.project.delete({ where: { id } });
      await logMutation("project", "Deleted", record.id, actor);
      return record;
    },
  },
  donors: {
    list: () => prisma.donor.findMany({ orderBy: { updatedAt: "desc" } }),
    get: (id: string) => prisma.donor.findUniqueOrThrow({ where: { id } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.donor.create({ data: donorSchema.parse(input) });
      await logMutation("donor", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.donor.update({ where: { id }, data: donorSchema.partial().parse(input) });
      await logMutation("donor", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.donor.delete({ where: { id } });
      await logMutation("donor", "Deleted", record.id, actor);
      return record;
    },
  },
  donations: {
    list: () => prisma.donation.findMany({ include: { donor: true, project: true }, orderBy: { receivedAt: "desc" } }),
    get: (id: string) => prisma.donation.findUniqueOrThrow({ where: { id }, include: { donor: true, project: true } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.donation.create({ data: donationSchema.parse(input) });
      await logMutation("donation", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.donation.update({ where: { id }, data: donationSchema.partial().parse(input) });
      await logMutation("donation", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.donation.delete({ where: { id } });
      await logMutation("donation", "Deleted", record.id, actor);
      return record;
    },
  },
  expenses: {
    list: () => prisma.expense.findMany({ include: { project: true }, orderBy: { submittedAt: "desc" } }),
    get: (id: string) => prisma.expense.findUniqueOrThrow({ where: { id }, include: { project: true } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.expense.create({ data: expenseSchema.parse(input) });
      await logMutation("expense", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.expense.update({ where: { id }, data: expenseSchema.partial().parse(input) });
      await logMutation("expense", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.expense.delete({ where: { id } });
      await logMutation("expense", "Deleted", record.id, actor);
      return record;
    },
  },
  transfers: {
    list: () => prisma.transfer.findMany({ include: { fromAccount: true, toAccount: true }, orderBy: { createdAt: "desc" } }),
    get: (id: string) => prisma.transfer.findUniqueOrThrow({ where: { id }, include: { fromAccount: true, toAccount: true } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.transfer.create({ data: transferSchema.parse(input) });
      await logMutation("transfer", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.transfer.update({ where: { id }, data: transferSchema.partial().parse(input) });
      await logMutation("transfer", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.transfer.delete({ where: { id } });
      await logMutation("transfer", "Deleted", record.id, actor);
      return record;
    },
  },
  reports: {
    list: () => prisma.report.findMany({ orderBy: { updatedAt: "desc" } }),
    get: (id: string) => prisma.report.findUniqueOrThrow({ where: { id } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.report.create({ data: reportSchema.parse(input) });
      await logMutation("report", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.report.update({ where: { id }, data: reportSchema.partial().parse(input) });
      await logMutation("report", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.report.delete({ where: { id } });
      await logMutation("report", "Deleted", record.id, actor);
      return record;
    },
  },
  settings: {
    list: () => prisma.appSetting.findMany({ orderBy: { label: "asc" } }),
    get: (id: string) => prisma.appSetting.findUniqueOrThrow({ where: { id } }),
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.appSetting.create({ data: settingSchema.parse(input) });
      await logMutation("setting", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const record = await prisma.appSetting.update({ where: { id }, data: settingSchema.partial().parse(input) });
      await logMutation("setting", "Updated", record.id, actor);
      return record;
    },
    delete: async (id: string, actor: AuthenticatedUser) => {
      const record = await prisma.appSetting.delete({ where: { id } });
      await logMutation("setting", "Deleted", record.id, actor);
      return record;
    },
  },
};
