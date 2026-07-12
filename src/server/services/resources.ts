import { isDemoMode } from "@/config/runtime";
import {
  demoDonationsPageData,
  demoDonorsPageData,
  demoExpenses,
  demoProjects,
  demoReports,
  demoSettingsSections,
  demoTransfers,
} from "@/data/demo-data";
import { Prisma } from "@prisma/client";
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

function jsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return {};
  }

  return value as Prisma.InputJsonValue;
}

function nullableJsonValue(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

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
    list: async () => isDemoMode ? demoProjects : prisma.project.findMany({ orderBy: { updatedAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoProjects.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.project.findUniqueOrThrow({ where: { id } });
    },
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
    list: async () => isDemoMode ? demoDonorsPageData.donors : prisma.donor.findMany({ orderBy: { updatedAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoDonorsPageData.donors.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.donor.findUniqueOrThrow({ where: { id } });
    },
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
    list: async () => isDemoMode ? demoDonationsPageData.donations : prisma.donation.findMany({ include: { donor: true, project: true }, orderBy: { receivedAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoDonationsPageData.donations.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.donation.findUniqueOrThrow({ where: { id }, include: { donor: true, project: true } });
    },
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
    list: async () => isDemoMode ? demoExpenses : prisma.expense.findMany({ include: { project: true }, orderBy: { submittedAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoExpenses.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.expense.findUniqueOrThrow({ where: { id }, include: { project: true } });
    },
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
    list: async () => isDemoMode ? demoTransfers : prisma.transfer.findMany({ include: { fromAccount: true, toAccount: true }, orderBy: { createdAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoTransfers.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.transfer.findUniqueOrThrow({ where: { id }, include: { fromAccount: true, toAccount: true } });
    },
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
    list: async () => isDemoMode ? demoReports : prisma.report.findMany({ orderBy: { updatedAt: "desc" } }),
    get: async (id: string) => {
      if (isDemoMode) return demoReports.find((item) => item.id === id) ?? Promise.reject(new Error("Not found"));
      return prisma.report.findUniqueOrThrow({ where: { id } });
    },
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const data = reportSchema.parse(input);
      const record = await prisma.report.create({ data: { ...data, payload: nullableJsonValue(data.payload) } });
      await logMutation("report", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const data = reportSchema.partial().parse(input);
      const record = await prisma.report.update({ where: { id }, data: { ...data, payload: nullableJsonValue(data.payload) } });
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
    list: async () => isDemoMode ? demoSettingsSections.map((setting) => ({
      id: setting.id,
      title: setting.title,
      description: setting.description,
      key: setting.key,
      isSecret: setting.isSecret,
    })) : prisma.appSetting.findMany({ orderBy: { label: "asc" } }),
    get: async (id: string) => {
      if (isDemoMode) {
        const setting = demoSettingsSections.find((item) => item.id === id);
        if (!setting) return Promise.reject(new Error("Not found"));
        return {
          id: setting.id,
          title: setting.title,
          description: setting.description,
          key: setting.key,
          isSecret: setting.isSecret,
        };
      }
      return prisma.appSetting.findUniqueOrThrow({ where: { id } });
    },
    create: async (input: unknown, actor: AuthenticatedUser) => {
      const data = settingSchema.parse(input);
      const record = await prisma.appSetting.create({ data: { ...data, value: jsonValue(data.value) } });
      await logMutation("setting", "Created", record.id, actor);
      return record;
    },
    update: async (id: string, input: unknown, actor: AuthenticatedUser) => {
      const data = settingSchema.partial().parse(input);
      const record = await prisma.appSetting.update({
        where: { id },
        data: { ...data, value: data.value === undefined ? undefined : jsonValue(data.value) },
      });
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
