import { prisma } from "@/lib/prisma/client";
import { formatCurrency, statusLabel } from "@/server/db/format";

export async function getExpenses() {
  const expenses = await prisma.expense.findMany({
    include: { project: true },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return expenses.map((expense) => ({
    id: expense.id,
    vendor: expense.vendor,
    category: expense.category,
    amount: formatCurrency(expense.amountCents),
    project: expense.project?.name ?? "General Operations",
    status: statusLabel(expense.status),
  }));
}
