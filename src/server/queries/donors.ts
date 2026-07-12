import { isDemoMode } from "@/config/runtime";
import { demoDonorsPageData } from "@/data/demo-data";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, statusLabel } from "@/server/db/format";

export async function getDonorsPageData() {
  if (isDemoMode) {
    return demoDonorsPageData;
  }

  const donors = await prisma.donor.findMany({
    include: {
      donations: {
        orderBy: { receivedAt: "desc" },
        select: { amountCents: true, receivedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const majorDonors = donors.filter((donor) => donor.donations.reduce((total, donation) => total + donation.amountCents, 0) >= 5000000).length;

  return {
    summary: [
      { value: String(donors.length), label: "total donors" },
      { value: String(donors.filter((donor) => donor.donations.length > 1).length), label: "repeat donors" },
      { value: String(majorDonors), label: "major donors" },
      { value: `${Math.round((donors.filter((donor) => donor.email).length / Math.max(donors.length, 1)) * 100)}%`, label: "contact coverage" },
    ],
    donors: donors.map((donor) => {
      const lifetimeCents = donor.donations.reduce((total, donation) => total + donation.amountCents, 0);
      return {
        id: donor.id,
        name: donor.name,
        type: statusLabel(donor.type),
        lifetime: formatCurrency(lifetimeCents),
        lastGift: donor.donations[0] ? formatCurrency(donor.donations[0].amountCents) : formatCurrency(0),
        contact: donor.contactName ?? donor.email ?? "No contact set",
        health: statusLabel(donor.health),
      };
    }),
  };
}
