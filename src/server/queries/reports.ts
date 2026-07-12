import { prisma } from "@/lib/prisma/client";
import { formatDate, statusLabel } from "@/server/db/format";

export async function getReports() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return reports.map((report) => ({
    id: report.id,
    name: report.name,
    owner: report.owner,
    updated: formatDate(report.updatedAt),
    status: statusLabel(report.status),
    description: report.description,
  }));
}
