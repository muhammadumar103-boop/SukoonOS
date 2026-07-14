import type { LocalDonation, LocalDonor } from "@/lib/local-data/schema";

export type DonorRow = LocalDonor & {
  donationCount: number;
  lastDonationDate: string;
  lifetimePkr: number;
  lifetimeUsd: number;
  projectsSupported: string[];
};

export function donationMetrics(donor: LocalDonor, donations: LocalDonation[]) {
  const donorDonations = donations.filter((donation) => {
    const sameId = donation.donorId === donor.id;
    const sameName = donation.donorName.trim().toLowerCase() === donor.fullName.trim().toLowerCase();
    return sameId || sameName;
  });

  return donorDonations.reduce(
    (result, donation) => {
      const sign = donation.status === "Refunded" || donation.status === "Cancelled" ? -1 : 1;
      result.PKR += donation.pkrAmount * sign;
      result.USD += donation.usdAmount * sign;
      result.count += 1;
      result.projects.add(donation.project);
      if (!result.lastDonationDate || donation.date > result.lastDonationDate) {
        result.lastDonationDate = donation.date;
      }
      return result;
    },
    {
      PKR: 0,
      USD: 0,
      count: 0,
      projects: new Set<string>(),
      lastDonationDate: "",
    },
  );
}

export function deriveDonorRows(donors: LocalDonor[], donations: LocalDonation[]): DonorRow[] {
  return donors.map((donor) => {
    const metrics = donationMetrics(donor, donations);

    return {
      ...donor,
      lifetimePkr: metrics.PKR,
      lifetimeUsd: metrics.USD,
      donationCount: metrics.count,
      lastDonationDate: metrics.lastDonationDate,
      projectsSupported: Array.from(metrics.projects),
    };
  });
}

export function filterDonorRows(
  donorRows: DonorRow[],
  options: {
    reminderFilter: "All" | LocalDonor["reminderStatus"];
    search: string;
    typeFilter: "All" | LocalDonor["donorType"];
  },
) {
  const query = options.search.trim().toLowerCase();

  return donorRows.filter((donor) => {
    const searchable = [
      donor.fullName,
      donor.country,
      donor.email,
      donor.phone,
      donor.whatsapp,
      donor.notes,
      donor.zakatPreference,
      donor.projectsSupported.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (options.typeFilter === "All" || donor.donorType === options.typeFilter) &&
      (options.reminderFilter === "All" || donor.reminderStatus === options.reminderFilter)
    );
  });
}
