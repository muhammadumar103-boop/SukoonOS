import {
  convertedExpenseAmounts,
  defaultUsdToPkrRate,
  formatMoney,
  type Currency,
  type FinanceAccount,
  type LocalExpense,
} from "@/lib/finance/local-finance";
import type { LocalDonation, LocalTransfer, LocalWorkspace } from "@/lib/local-data/schema";

export type LedgerType = "Donation" | "Expense" | "Transfer" | "Refund" | "Fee" | "Adjustment";

export type FinanceLedgerEntry = {
  id: string;
  sourceId: string;
  date: string;
  type: LedgerType;
  description: string;
  projectId: string;
  project: string;
  party: string;
  method: string;
  reference: string;
  status: string;
  accountId: string;
  contraAccountId?: string;
  originalCurrency: Currency;
  originalAmount: number;
  exchangeRate: number;
  pkrAmount: number;
  usdAmount: number;
  netPkrAmount: number;
  netUsdAmount: number;
  originalLabel: string;
  convertedLabel: string;
};

function convertedLabel(originalCurrency: Currency, pkrAmount: number, usdAmount: number) {
  return originalCurrency === "PKR" ? formatMoney(usdAmount, "USD") : formatMoney(pkrAmount, "PKR");
}

export function donationToLedger(donation: LocalDonation): FinanceLedgerEntry {
  const signedPkr = donation.status === "Refunded" || donation.status === "Cancelled" ? -Math.abs(donation.pkrAmount) : donation.pkrAmount;
  const signedUsd = donation.status === "Refunded" || donation.status === "Cancelled" ? -Math.abs(donation.usdAmount) : donation.usdAmount;
  const signedOriginal = donation.status === "Refunded" || donation.status === "Cancelled" ? -Math.abs(donation.originalAmount) : donation.originalAmount;

  return {
    id: `ledger-${donation.id}`,
    sourceId: donation.id,
    date: donation.date,
    type: donation.status === "Refunded" ? "Refund" : "Donation",
    description: `Donation from ${donation.donorName}`,
    projectId: donation.projectId,
    project: donation.project,
    party: donation.donorName,
    method: donation.method,
    reference: donation.receiptReference || "No receipt",
    status: donation.status,
    accountId: donation.accountId,
    originalCurrency: donation.originalCurrency,
    originalAmount: signedOriginal,
    exchangeRate: donation.exchangeRate,
    pkrAmount: signedPkr,
    usdAmount: signedUsd,
    netPkrAmount: signedPkr,
    netUsdAmount: signedUsd,
    originalLabel: formatMoney(signedOriginal, donation.originalCurrency),
    convertedLabel: convertedLabel(donation.originalCurrency, signedPkr, signedUsd),
  };
}

export function expenseToLedger(expense: LocalExpense): FinanceLedgerEntry {
  const amounts = convertedExpenseAmounts(expense);
  const pkrAmount = -Math.abs(amounts.pkr);
  const usdAmount = -Math.abs(amounts.usd);
  const originalAmount = -Math.abs(expense.originalAmount);

  return {
    id: `ledger-${expense.id}`,
    sourceId: expense.id,
    date: expense.date,
    type: "Expense",
    description: expense.description,
    projectId: expense.projectId,
    project: expense.project,
    party: expense.paidBy || "Not set",
    method: expense.paymentMethod,
    reference: expense.receiptReference || "No receipt",
    status: expense.approvalStatus,
    accountId: expense.fundingAccountId,
    originalCurrency: expense.originalCurrency,
    originalAmount,
    exchangeRate: expense.exchangeRate,
    pkrAmount,
    usdAmount,
    netPkrAmount: pkrAmount,
    netUsdAmount: usdAmount,
    originalLabel: formatMoney(originalAmount, expense.originalCurrency),
    convertedLabel: formatMoney(-Math.abs(amounts.convertedAmount), amounts.convertedCurrency),
  };
}

export function transferToLedger(transfer: LocalTransfer, accounts: FinanceAccount[]): FinanceLedgerEntry {
  const from = accounts.find((account) => account.id === transfer.fromAccountId);
  const to = accounts.find((account) => account.id === transfer.toAccountId);

  return {
    id: `ledger-${transfer.id}`,
    sourceId: transfer.id,
    date: transfer.date,
    type: "Transfer",
    description: `${from?.name ?? "Unknown account"} to ${to?.name ?? "Unknown account"}`,
    projectId: transfer.projectId,
    project: transfer.project,
    party: from?.name ?? "Internal transfer",
    method: "Internal Transfer",
    reference: transfer.reference || "No reference",
    status: transfer.status,
    accountId: transfer.fromAccountId,
    contraAccountId: transfer.toAccountId,
    originalCurrency: transfer.originalCurrency,
    originalAmount: transfer.originalAmount,
    exchangeRate: transfer.exchangeRate,
    pkrAmount: transfer.pkrAmount,
    usdAmount: transfer.usdAmount,
    netPkrAmount: 0,
    netUsdAmount: 0,
    originalLabel: formatMoney(transfer.originalAmount, transfer.originalCurrency),
    convertedLabel: convertedLabel(transfer.originalCurrency, transfer.pkrAmount, transfer.usdAmount),
  };
}

export function staticLedgerEntries(): FinanceLedgerEntry[] {
  return [
    {
      id: "ledger-refund-1",
      sourceId: "refund-1",
      date: "2026-07-08",
      type: "Refund",
      description: "Vendor refund for duplicate medical supply invoice",
      projectId: "project-hospital",
      project: "Hospital Project",
      party: "City Medical Supplies",
      method: "Bank Transfer",
      reference: "REF-1021",
      status: "Received",
      accountId: "operations-bank-pkr",
      originalCurrency: "PKR",
      originalAmount: 85000,
      exchangeRate: 278,
      pkrAmount: 85000,
      usdAmount: 85000 / 278,
      netPkrAmount: 85000,
      netUsdAmount: 85000 / 278,
      originalLabel: formatMoney(85000, "PKR"),
      convertedLabel: formatMoney(85000 / 278, "USD"),
    },
    {
      id: "ledger-fee-1",
      sourceId: "fee-1",
      date: "2026-07-07",
      type: "Fee",
      description: "Bank transfer fee for program account movement",
      projectId: "project-general-operations",
      project: "General Operations",
      party: "Bank",
      method: "Bank Transfer",
      reference: "FEE-3308",
      status: "Paid",
      accountId: "operations-bank-pkr",
      originalCurrency: "PKR",
      originalAmount: -2600,
      exchangeRate: 278,
      pkrAmount: -2600,
      usdAmount: -2600 / 278,
      netPkrAmount: -2600,
      netUsdAmount: -2600 / 278,
      originalLabel: formatMoney(-2600, "PKR"),
      convertedLabel: formatMoney(-2600 / 278, "USD"),
    },
    {
      id: "ledger-adjustment-1",
      sourceId: "adjustment-1",
      date: "2026-07-05",
      type: "Adjustment",
      description: "Opening balance adjustment for local demo ledger",
      projectId: "project-general-operations",
      project: "General Operations",
      party: "Finance",
      method: "Adjustment",
      reference: "ADJ-0001",
      status: "Approved",
      accountId: "main-donations-bank",
      originalCurrency: "USD",
      originalAmount: 15000,
      exchangeRate: defaultUsdToPkrRate,
      pkrAmount: 15000 * defaultUsdToPkrRate,
      usdAmount: 15000,
      netPkrAmount: 15000 * defaultUsdToPkrRate,
      netUsdAmount: 15000,
      originalLabel: formatMoney(15000, "USD"),
      convertedLabel: formatMoney(15000 * defaultUsdToPkrRate, "PKR"),
    },
  ];
}

export function buildFinanceLedger(workspace: Pick<LocalWorkspace, "donations" | "expenses" | "transfers" | "financeAccounts">) {
  return [
    ...workspace.donations.map(donationToLedger),
    ...workspace.expenses.map(expenseToLedger),
    ...workspace.transfers.map((transfer) => transferToLedger(transfer, workspace.financeAccounts)),
    ...staticLedgerEntries(),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function accountBalanceFromLedger(account: FinanceAccount, entries: FinanceLedgerEntry[]) {
  return entries.reduce((balance, entry) => {
    if (entry.type === "Transfer") {
      if (entry.accountId === account.id) {
        return balance - (account.currency === "PKR" ? entry.pkrAmount : entry.usdAmount);
      }

      if (entry.contraAccountId === account.id) {
        return balance + (account.currency === "PKR" ? entry.pkrAmount : entry.usdAmount);
      }

      return balance;
    }

    if (entry.accountId !== account.id) {
      return balance;
    }

    return balance + (account.currency === "PKR" ? entry.netPkrAmount : entry.netUsdAmount);
  }, account.openingBalance);
}
