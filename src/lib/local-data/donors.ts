import { donationImpactsBalances } from "@/lib/local-data/finance-rules";
import type { LocalDonation, LocalDonor } from "@/lib/local-data/schema";

type DonorReference = {
  donorId?: string;
  donorName?: string;
};

export type DonorRow = LocalDonor & {
  donationCount: number;
  effectiveReminderStatus: LocalDonor["reminderStatus"];
  lastDonationDate: string;
  lifetimePkr: number;
  lifetimeUsd: number;
  projectsSupported: string[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDonorName(name: string) {
  return name.trim().toLowerCase();
}

export function slugifyDonorName(name: string) {
  return normalizeDonorName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function donorReminderStatus(donor: LocalDonor): LocalDonor["reminderStatus"] {
  if (donor.reminderStatus === "Completed" || donor.reminderStatus === "None") {
    return donor.reminderStatus;
  }

  if (!donor.nextUpdateDueDate) {
    return donor.reminderStatus;
  }

  return donor.nextUpdateDueDate < todayIso() ? "Overdue" : "Upcoming";
}

export function findDonorByReference(donors: LocalDonor[], reference: DonorReference) {
  if (reference.donorId) {
    const byId = donors.find((donor) => donor.id === reference.donorId);
    if (byId) {
      return byId;
    }
  }

  if (!reference.donorName) {
    return undefined;
  }

  const normalizedName = normalizeDonorName(reference.donorName);
  return donors.find((donor) => normalizeDonorName(donor.fullName) === normalizedName);
}

export function resolveDonorReference(donors: LocalDonor[], reference: DonorReference) {
  const donor = findDonorByReference(donors, reference);

  if (donor) {
    return {
      donorId: donor.id,
      donorName: reference.donorName?.trim() || donor.fullName,
      displayName: donor.fullName,
    };
  }

  const fallbackName = reference.donorName?.trim() || "Unknown donor";
  return {
    donorId: reference.donorId?.trim() || `legacy-donor-${slugifyDonorName(fallbackName) || "unknown"}`,
    donorName: fallbackName,
    displayName: fallbackName,
  };
}

export function donorLabel(donors: LocalDonor[], reference: DonorReference) {
  return findDonorByReference(donors, reference)?.fullName ?? reference.donorName?.trim() ?? "Unknown donor";
}

export function donationMetrics(donor: LocalDonor, donations: LocalDonation[]) {
  const donorDonations = donations.filter((donation) => {
    const sameId = donation.donorId === donor.id;
    const sameName = normalizeDonorName(donation.donorName) === normalizeDonorName(donor.fullName);
    return sameId || sameName;
  });

  return donorDonations.reduce(
    (result, donation) => {
      if (!donationImpactsBalances(donation)) {
        return result;
      }

      const sign = donation.status === "Refunded" ? -1 : 1;
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
      effectiveReminderStatus: donorReminderStatus(donor),
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
      donor.preferredContactMethod,
      donor.givingPreferences.join(" "),
      donor.notes,
      donor.zakatPreference,
      donor.recurringDonor ? "recurring" : "one-time",
      donor.effectiveReminderStatus,
      donor.projectsSupported.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (options.typeFilter === "All" || donor.donorType === options.typeFilter) &&
      (options.reminderFilter === "All" || donor.effectiveReminderStatus === options.reminderFilter)
    );
  });
}
