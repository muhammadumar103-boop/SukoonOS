import { prisma } from "@/lib/prisma/client";

export async function getSettingsSections() {
  const settings = await prisma.appSetting.findMany({
    orderBy: { label: "asc" },
  });

  return settings.map((setting) => ({
    id: setting.id,
    title: setting.label,
    description: setting.description ?? `Configured by ${setting.key}.`,
    key: setting.key,
    isSecret: setting.isSecret,
  }));
}
