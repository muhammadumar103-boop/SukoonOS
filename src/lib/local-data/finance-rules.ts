import { convertedExpenseAmounts, type ApprovalStatus, type LocalExpense } from "@/lib/finance/local-finance";
import type { LocalDonation, LocalFinancialRecord, LocalTransfer } from "@/lib/local-data/schema";

export const finalDonationStatuses = ["Received", "Refunded"] as const;
export const finalExpenseStatuses = ["Approved", "Paid"] as const;
export const finalTransferStatuses = ["Completed"] as const;
export const finalFinancialRecordStatuses = ["Approved", "Posted"] as const;

export function donationImpactsBalances(donation: LocalDonation) {
  return (finalDonationStatuses as readonly string[]).includes(donation.status);
}

export function expenseImpactsBalances(expense: Pick<LocalExpense, "approvalStatus">) {
  return (finalExpenseStatuses as readonly string[]).includes(expense.approvalStatus);
}

export function transferImpactsBalances(transfer: Pick<LocalTransfer, "status">) {
  return (finalTransferStatuses as readonly string[]).includes(transfer.status);
}

export function financialRecordImpactsBalances(record: Pick<LocalFinancialRecord, "status">) {
  return (finalFinancialRecordStatuses as readonly string[]).includes(record.status);
}

export function donationSignedAmounts(donation: LocalDonation) {
  const sign = donation.status === "Refunded" ? -1 : 1;
  const originalAmount = sign * Math.abs(donation.originalAmount);
  const pkrAmount = sign * Math.abs(donation.pkrAmount);
  const usdAmount = sign * Math.abs(donation.usdAmount);

  return {
    impactsBalances: donationImpactsBalances(donation),
    originalAmount,
    pkrAmount,
    usdAmount,
    netOriginalAmount: donationImpactsBalances(donation) ? originalAmount : 0,
    netPkrAmount: donationImpactsBalances(donation) ? pkrAmount : 0,
    netUsdAmount: donationImpactsBalances(donation) ? usdAmount : 0,
  };
}

export function expenseSignedAmounts(expense: LocalExpense) {
  const amounts = convertedExpenseAmounts(expense);
  const originalAmount = -Math.abs(expense.originalAmount);
  const pkrAmount = -Math.abs(amounts.pkr);
  const usdAmount = -Math.abs(amounts.usd);
  const impactsBalances = expenseImpactsBalances(expense);

  return {
    convertedCurrency: amounts.convertedCurrency,
    convertedAmount: -Math.abs(amounts.convertedAmount),
    impactsBalances,
    originalAmount,
    pkrAmount,
    usdAmount,
    netOriginalAmount: impactsBalances ? originalAmount : 0,
    netPkrAmount: impactsBalances ? pkrAmount : 0,
    netUsdAmount: impactsBalances ? usdAmount : 0,
  };
}

export function transferSignedAmounts(transfer: LocalTransfer) {
  const impactsBalances = transferImpactsBalances(transfer);

  return {
    impactsBalances,
    originalAmount: Math.abs(transfer.originalAmount),
    pkrAmount: Math.abs(transfer.pkrAmount),
    usdAmount: Math.abs(transfer.usdAmount),
    netOriginalAmount: impactsBalances ? Math.abs(transfer.originalAmount) : 0,
    netPkrAmount: 0,
    netUsdAmount: 0,
  };
}

export function financialRecordSignedAmounts(record: LocalFinancialRecord) {
  const sign = record.type === "Fee" ? -1 : 1;
  const impactsBalances = financialRecordImpactsBalances(record);
  const originalAmount = sign * Math.abs(record.originalAmount);
  const pkrAmount = sign * Math.abs(record.pkrAmount);
  const usdAmount = sign * Math.abs(record.usdAmount);

  return {
    impactsBalances,
    originalAmount,
    pkrAmount,
    usdAmount,
    netOriginalAmount: impactsBalances ? originalAmount : 0,
    netPkrAmount: impactsBalances ? pkrAmount : 0,
    netUsdAmount: impactsBalances ? usdAmount : 0,
  };
}

export function validatePositiveMoneyInput(value: number, label = "Amount") {
  if (!Number.isFinite(value)) {
    return `${label} must be a valid number.`;
  }

  if (value <= 0) {
    return `${label} must be greater than zero.`;
  }

  return "";
}

export function validateExchangeRateInput(value: number) {
  if (!Number.isFinite(value)) {
    return "Exchange rate must be a valid number.";
  }

  if (value <= 0) {
    return "Exchange rate must be greater than zero.";
  }

  return "";
}

export function nextExpenseVoidStatus(expense: Pick<LocalExpense, "approvalStatus">) {
  return expenseImpactsBalances(expense) ? ("Voided" as ApprovalStatus) : ("Voided" as ApprovalStatus);
}
