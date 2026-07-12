import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate, statusLabel } from "@/server/db/format";

export async function getDonationsPageData() {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [donations, monthTotal, recurringDonors, donationCount] = await Promise.all([
    prisma.donation.findMany({
      include: { donor: true, project: true },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
    prisma.donation.aggregate({
      _sum: { amountCents: true },
      where: { status: "RECEIVED", receivedAt: { gte: currentMonth } },
    }),
    prisma.donor.count({
      where: {
        donations: {
          some: {},
        },
      },
    }),
    prisma.donation.count({ where: { receivedAt: { gte: currentMonth } } }),
  ]);

  const totalCents = monthTotal._sum.amountCents ?? 0;

  return {
    summary: {
      monthTotal: formatCurrency(totalCents),
      averageGift: formatCurrency(donationCount ? Math.round(totalCents / donationCount) : 0),
      recurringDonors: String(recurringDonors),
    },
    donations: donations.map((donation) => ({
      id: donation.id,
      donor: donation.donor.name,
      amount: formatCurrency(donation.amountCents),
      method: donation.method,
      fund: donation.fund,
      date: formatDate(donation.receivedAt),
      status: statusLabel(donation.status),
    })),
  };
}
