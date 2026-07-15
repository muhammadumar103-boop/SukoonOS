import { accountBalanceFromLedger, buildFinanceLedger } from "@/lib/finance/ledger";
import {
  donationSignedAmounts,
  expenseSignedAmounts,
  financialRecordSignedAmounts,
  transferImpactsBalances,
} from "@/lib/local-data/finance-rules";
import { recordMatchesProjectReference } from "@/lib/local-data/projects";
import type { LocalWorkspace } from "@/lib/local-data/schema";

export function donorLinkCounts(workspace: LocalWorkspace, donorId: string) {
  return {
    donations: workspace.donations.filter((donation) => donation.donorId === donorId).length,
  };
}

export function projectLinkCounts(workspace: LocalWorkspace, projectId: string) {
  const project = workspace.projects.find((item) => item.id === projectId);
  const projectReference = { projectId, project: project?.name ?? "" };

  return {
    approvals: workspace.approvals.filter((approval) => approval.sourceId === projectId).length,
    budgets: workspace.financeBudgets.filter((budget) => recordMatchesProjectReference(budget, projectReference)).length,
    donations: workspace.donations.filter((donation) => recordMatchesProjectReference(donation, projectReference)).length,
    expenses: workspace.expenses.filter((expense) => recordMatchesProjectReference(expense, projectReference)).length,
    financialRecords: workspace.financialRecords.filter((record) => recordMatchesProjectReference(record, projectReference)).length,
    tasks: workspace.tasks.filter((task) => task.projectId === projectId).length,
    transfers: workspace.transfers.filter((transfer) => recordMatchesProjectReference(transfer, projectReference)).length,
  };
}

export function accountLinkCounts(workspace: LocalWorkspace, accountId: string) {
  return {
    donations: workspace.donations.filter((donation) => donation.accountId === accountId).length,
    expenses: workspace.expenses.filter((expense) => expense.fundingAccountId === accountId).length,
    financialRecords: workspace.financialRecords.filter((record) => record.accountId === accountId).length,
    transfersFrom: workspace.transfers.filter((transfer) => transfer.fromAccountId === accountId).length,
    transfersTo: workspace.transfers.filter((transfer) => transfer.toAccountId === accountId).length,
  };
}

export type ReconciliationCheck = {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
};

export function deriveReconciliationChecks(workspace: LocalWorkspace): ReconciliationCheck[] {
  const ledger = buildFinanceLedger(workspace);
  const postedExpenses = workspace.expenses.filter((expense) => expenseSignedAmounts(expense).impactsBalances);
  const postedTransfers = workspace.transfers.filter((transfer) => transferImpactsBalances(transfer));
  const postedRecords = workspace.financialRecords.filter((record) => financialRecordSignedAmounts(record).impactsBalances);

  const accountChecks = workspace.financeAccounts.map((account) => {
    const matchingEntries = ledger.filter((entry) => entry.accountId === account.id || entry.contraAccountId === account.id);
    const derivedBalance = accountBalanceFromLedger(account, ledger);
    const manuallyProjected = matchingEntries.reduce((sum, entry) => {
      if (entry.type === "Transfer") {
        if (!transferImpactsBalances({ status: entry.status as LocalWorkspace["transfers"][number]["status"] })) {
          return sum;
        }

        if (entry.accountId === account.id) {
          return sum - (account.currency === "PKR" ? entry.pkrAmount : entry.usdAmount);
        }

        if (entry.contraAccountId === account.id) {
          return sum + (account.currency === "PKR" ? entry.pkrAmount : entry.usdAmount);
        }

        return sum;
      }

      if (entry.accountId !== account.id) {
        return sum;
      }

      return sum + (account.currency === "PKR" ? entry.netPkrAmount : entry.netUsdAmount);
    }, account.openingBalance);

    return {
      id: `account-${account.id}`,
      label: `${account.name} balance`,
      detail: `Expected ${manuallyProjected.toFixed(2)} ${account.currency}, derived ${derivedBalance.toFixed(2)} ${account.currency}`,
      ok: Math.abs(manuallyProjected - derivedBalance) < 0.0001,
    } satisfies ReconciliationCheck;
  });

  const transferChecks = postedTransfers.map((transfer) => ({
    id: `transfer-${transfer.id}`,
    label: `Transfer ${transfer.reference || transfer.id}`,
    detail: `${transfer.fromAccountId} -> ${transfer.toAccountId} for ${transfer.originalAmount} ${transfer.originalCurrency}`,
    ok: transfer.fromAccountId !== transfer.toAccountId && transfer.originalAmount > 0 && transfer.exchangeRate > 0,
  }));

  const expenseChecks = postedExpenses.map((expense) => ({
    id: `expense-${expense.id}`,
    label: `Expense ${expense.receiptReference || expense.id}`,
    detail: `${expense.category} for ${expense.originalAmount} ${expense.originalCurrency}`,
    ok: expense.originalAmount > 0 && expense.exchangeRate > 0 && Boolean(expense.fundingAccountId),
  }));

  const donationChecks = workspace.donations.map((donation) => ({
    id: `donation-${donation.id}`,
    label: `Donation ${donation.receiptReference || donation.id}`,
    detail: `${donation.donorName} · ${donation.status}`,
    ok: donation.originalAmount > 0 && donation.exchangeRate > 0 && Boolean(donation.accountId) && Boolean(donation.donorId),
  }));

  const ledgerNetPkr = ledger.reduce((sum, entry) => sum + entry.netPkrAmount, 0);
  const ledgerNetUsd = ledger.reduce((sum, entry) => sum + entry.netUsdAmount, 0);
  const sourceNetPkr =
    workspace.donations.reduce((sum, donation) => sum + donationSignedAmounts(donation).netPkrAmount, 0) +
    postedExpenses.reduce((sum, expense) => sum + expenseSignedAmounts(expense).netPkrAmount, 0) +
    postedRecords.reduce((sum, record) => sum + financialRecordSignedAmounts(record).netPkrAmount, 0);
  const sourceNetUsd =
    workspace.donations.reduce((sum, donation) => sum + donationSignedAmounts(donation).netUsdAmount, 0) +
    postedExpenses.reduce((sum, expense) => sum + expenseSignedAmounts(expense).netUsdAmount, 0) +
    postedRecords.reduce((sum, record) => sum + financialRecordSignedAmounts(record).netUsdAmount, 0);

  const ledgerChecks: ReconciliationCheck[] = [
    {
      id: "ledger-net-pkr",
      label: "Ledger PKR total",
      detail: `Ledger ${ledgerNetPkr.toFixed(2)} PKR, source ${sourceNetPkr.toFixed(2)} PKR`,
      ok: Math.abs(ledgerNetPkr - sourceNetPkr) < 0.0001,
    },
    {
      id: "ledger-net-usd",
      label: "Ledger USD total",
      detail: `Ledger ${ledgerNetUsd.toFixed(2)} USD, source ${sourceNetUsd.toFixed(2)} USD`,
      ok: Math.abs(ledgerNetUsd - sourceNetUsd) < 0.0001,
    },
  ];

  return [...accountChecks, ...transferChecks, ...expenseChecks, ...donationChecks, ...ledgerChecks];
}
