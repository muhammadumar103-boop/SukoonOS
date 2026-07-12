import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate, statusLabel } from "@/server/db/format";

export async function getTransfers() {
  const transfers = await prisma.transfer.findMany({
    include: { fromAccount: true, toAccount: true },
    orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return transfers.map((transfer) => ({
    id: transfer.id,
    from: transfer.fromAccount.name,
    to: transfer.toAccount.name,
    amount: formatCurrency(transfer.amountCents, transfer.fromAccount.currency),
    date: formatDate(transfer.scheduledFor ?? transfer.completedAt ?? transfer.createdAt),
    status: statusLabel(transfer.status),
  }));
}
