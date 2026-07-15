import {
  formatMoney,
  type Currency,
  type FinanceAccount,
} from "@/lib/finance/local-finance";
import {
  donationSignedAmounts,
  expenseSignedAmounts,
  financialRecordSignedAmounts,
  transferImpactsBalances,
  transferSignedAmounts,
} from "@/lib/local-data/finance-rules";
import type { LocalDonation, LocalFinancialRecord, LocalTransfer, LocalWorkspace } from "@/lib/local-data/schema";
import type { LocalExpense } from "@/lib/finance/local-finance";

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
  const signed = donationSignedAmounts(donation);

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
    originalAmount: signed.originalAmount,
    exchangeRate: donation.exchangeRate,
    pkrAmount: signed.pkrAmount,
    usdAmount: signed.usdAmount,
    netPkrAmount: signed.netPkrAmount,
    netUsdAmount: signed.netUsdAmount,
    originalLabel: formatMoney(signed.originalAmount, donation.originalCurrency),
    convertedLabel: convertedLabel(donation.originalCurrency, signed.pkrAmount, signed.usdAmount),
  };
}

export function expenseToLedger(expense: LocalExpense): FinanceLedgerEntry {
  const signed = expenseSignedAmounts(expense);

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
    originalAmount: signed.originalAmount,
    exchangeRate: expense.exchangeRate,
    pkrAmount: signed.pkrAmount,
    usdAmount: signed.usdAmount,
    netPkrAmount: signed.netPkrAmount,
    netUsdAmount: signed.netUsdAmount,
    originalLabel: formatMoney(signed.originalAmount, expense.originalCurrency),
    convertedLabel: formatMoney(signed.convertedAmount, signed.convertedCurrency),
  };
}

export function transferToLedger(transfer: LocalTransfer, accounts: FinanceAccount[]): FinanceLedgerEntry {
  const from = accounts.find((account) => account.id === transfer.fromAccountId);
  const to = accounts.find((account) => account.id === transfer.toAccountId);
  const signed = transferSignedAmounts(transfer);

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
    originalAmount: signed.originalAmount,
    exchangeRate: transfer.exchangeRate,
    pkrAmount: signed.pkrAmount,
    usdAmount: signed.usdAmount,
    netPkrAmount: signed.netPkrAmount,
    netUsdAmount: signed.netUsdAmount,
    originalLabel: formatMoney(signed.originalAmount, transfer.originalCurrency),
    convertedLabel: convertedLabel(transfer.originalCurrency, signed.pkrAmount, signed.usdAmount),
  };
}

export function financialRecordToLedger(record: LocalFinancialRecord): FinanceLedgerEntry {
  const signed = financialRecordSignedAmounts(record);

  return {
    id: `ledger-${record.id}`,
    sourceId: record.id,
    date: record.date,
    type: record.type,
    description: record.description,
    projectId: record.projectId,
    project: record.project,
    party: record.party || "Finance",
    method: record.method,
    reference: record.reference || "No reference",
    status: record.status,
    accountId: record.accountId,
    originalCurrency: record.originalCurrency,
    originalAmount: signed.originalAmount,
    exchangeRate: record.exchangeRate,
    pkrAmount: signed.pkrAmount,
    usdAmount: signed.usdAmount,
    netPkrAmount: signed.netPkrAmount,
    netUsdAmount: signed.netUsdAmount,
    originalLabel: formatMoney(signed.originalAmount, record.originalCurrency),
    convertedLabel: convertedLabel(record.originalCurrency, signed.pkrAmount, signed.usdAmount),
  };
}

export function buildFinanceLedger(
  workspace: Pick<LocalWorkspace, "donations" | "expenses" | "transfers" | "financialRecords" | "financeAccounts">,
) {
  return [
    ...workspace.donations.map(donationToLedger),
    ...workspace.expenses.map(expenseToLedger),
    ...workspace.transfers.map((transfer) => transferToLedger(transfer, workspace.financeAccounts)),
    ...workspace.financialRecords.map(financialRecordToLedger),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function accountBalanceFromLedger(account: FinanceAccount, entries: FinanceLedgerEntry[]) {
  return entries.reduce((balance, entry) => {
    if (entry.type === "Transfer") {
      if (!transferImpactsBalances({ status: entry.status as LocalTransfer["status"] })) {
        return balance;
      }

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
