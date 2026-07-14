import { defaultUsdToPkrRate } from "@/lib/finance/local-finance";
import type { LocalDonation, LocalTransfer } from "@/lib/local-data/schema";

function moneyValues(originalAmount: number, originalCurrency: "PKR" | "USD", exchangeRate: number) {
  if (originalCurrency === "PKR") {
    return {
      originalAmount,
      originalCurrency,
      exchangeRate,
      pkrAmount: originalAmount,
      usdAmount: originalAmount / exchangeRate,
    };
  }

  return {
    originalAmount,
    originalCurrency,
    exchangeRate,
    pkrAmount: originalAmount * exchangeRate,
    usdAmount: originalAmount,
  };
}

export const sampleLocalDonations: LocalDonation[] = [
  {
    id: "donation-1",
    donorId: "donor-1",
    donorName: "Al Noor Group",
    project: "Food Parcels",
    accountId: "main-donations-bank",
    method: "Bank Transfer",
    date: "2026-07-11",
    status: "Received",
    receiptReference: "DON-0001",
    notes: "Sample donation for Food Parcels.",
    ...moneyValues(12500, "USD", defaultUsdToPkrRate),
  },
  {
    id: "donation-2",
    donorId: "donor-2",
    donorName: "Sarah Malik",
    project: "Hospital Project",
    accountId: "main-donations-bank",
    method: "Card",
    date: "2026-07-11",
    status: "Received",
    receiptReference: "DON-0002",
    notes: "Sample hospital donation.",
    ...moneyValues(2000, "USD", defaultUsdToPkrRate),
  },
  {
    id: "donation-3",
    donorId: "donor-3",
    donorName: "Rahman Family Trust",
    project: "Orphan Sponsorship",
    accountId: "main-donations-bank",
    method: "Cheque",
    date: "2026-07-10",
    status: "Processing",
    receiptReference: "DON-0003",
    notes: "Sample pledge under processing.",
    ...moneyValues(25000, "USD", defaultUsdToPkrRate),
  },
  {
    id: "donation-4",
    donorId: "donor-4",
    donorName: "Green Crescent LLC",
    project: "Daily Iftar",
    accountId: "main-donations-bank",
    method: "Bank Transfer",
    date: "2026-07-09",
    status: "Received",
    receiptReference: "DON-0004",
    notes: "Sample iftar donation.",
    ...moneyValues(8750, "USD", defaultUsdToPkrRate),
  },
];

export const sampleLocalTransfers: LocalTransfer[] = [
  {
    id: "transfer-1",
    fromAccountId: "main-donations-bank",
    toAccountId: "field-cash-pkr",
    project: "Field Operations",
    date: "2026-07-12",
    status: "Scheduled",
    reference: "TRF-0001",
    notes: "Sample transfer to field cash.",
    ...moneyValues(18000, "USD", defaultUsdToPkrRate),
  },
  {
    id: "transfer-2",
    fromAccountId: "main-donations-bank",
    toAccountId: "operations-bank-pkr",
    project: "Hospital Project",
    date: "2026-07-10",
    status: "Completed",
    reference: "TRF-0002",
    notes: "Sample allocation to Hospital Project.",
    ...moneyValues(22500, "USD", defaultUsdToPkrRate),
  },
  {
    id: "transfer-3",
    fromAccountId: "main-donations-bank",
    toAccountId: "operations-bank-pkr",
    project: "Orphan Sponsorship",
    date: "2026-07-08",
    status: "Completed",
    reference: "TRF-0003",
    notes: "Sample allocation to Orphan Sponsorship.",
    ...moneyValues(15000, "USD", defaultUsdToPkrRate),
  },
];
