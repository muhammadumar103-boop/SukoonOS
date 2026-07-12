import { isDemoMode } from "@/config/runtime";
import { demoSettingsSections } from "@/data/demo-data";
import { prisma } from "@/lib/prisma/client";

export async function getSettingsSections() {
  if (isDemoMode) {
    return demoSettingsSections.map((setting) => ({
      id: setting.id,
      title: setting.title,
      description: setting.description,
      key: setting.key,
      isSecret: setting.isSecret,
    }));
  }

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
