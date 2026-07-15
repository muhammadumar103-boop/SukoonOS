import { accountBalanceFromLedger, buildFinanceLedger } from "@/lib/finance/ledger";
import { convertedExpenseAmounts, formatMoney, type Currency } from "@/lib/finance/local-finance";
import { donorLabel, deriveDonorRows } from "@/lib/local-data/donors";
import { expenseHasProof, expenseProofFileNames, expenseProofStatusLabel } from "@/lib/local-data/expense-proofs";
import { donationImpactsBalances, expenseImpactsBalances, transferImpactsBalances } from "@/lib/local-data/finance-rules";
import {
  deriveProjectRows,
  generalFundAllocationLabel,
  generalOperationsProjectLabel,
  projectLabel,
  recordMatchesProject,
} from "@/lib/local-data/projects";
import { deriveApprovalRows } from "@/lib/local-data/workflows";
import type { LocalWorkspace } from "@/lib/local-data/schema";

export const operatingExpensesFilterValue = "__operating_expenses__";
export const generalFundFilterValue = "__general_fund__";

export const reportTypes = [
  { id: "monthly-donations", label: "Monthly donations" },
  { id: "monthly-expenses", label: "Monthly expenses" },
  { id: "project-income-spending", label: "Project income and spending" },
  { id: "expense-category-totals", label: "Expense category totals" },
  { id: "account-balances", label: "Account balances" },
  { id: "transfer-history", label: "Transfer history" },
  { id: "donor-giving", label: "Donor giving" },
  { id: "missing-receipts", label: "Missing receipts" },
  { id: "missing-expense-proof", label: "Missing expense proof" },
  { id: "pending-approvals", label: "Pending approvals" },
  { id: "dual-currency-totals", label: "Dual-currency totals" },
  { id: "annual-charity-summary", label: "Annual charity finance summary" },
] as const;

export type ReportType = (typeof reportTypes)[number]["id"];

export type ReportFilters = {
  accountId: string;
  category: string;
  currency: "All" | Currency;
  dateFrom: string;
  dateTo: string;
  donorId: string;
  projectId: string;
  search: string;
  status: string;
};

type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

type ReportSummaryItem = {
  label: string;
  value: string;
};

type ReportRow = Record<string, string | number>;

export type ReportResult = {
  columns: ReportColumn[];
  csvFileName: string;
  description: string;
  payload: Record<string, unknown>;
  rows: ReportRow[];
  summary: ReportSummaryItem[];
  title: string;
};

function inDateRange(date: string, filters: ReportFilters) {
  if (filters.dateFrom && date < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && date > filters.dateTo) {
    return false;
  }

  return true;
}

function matchesSearch(value: string, search: string) {
  return !search || value.toLowerCase().includes(search.toLowerCase());
}

function filterRowsBySearch(rows: ReportRow[], search: string) {
  if (!search.trim()) {
    return rows;
  }

  return rows.filter((row) => matchesSearch(Object.values(row).join(" "), search));
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function yearKey(date: string) {
  return date.slice(0, 4);
}

function accountName(workspace: LocalWorkspace, accountId: string) {
  return workspace.financeAccounts.find((account) => account.id === accountId)?.name ?? accountId;
}

function matchesProjectFilter(
  workspace: LocalWorkspace,
  selectedProjectId: string,
  reference: { projectId?: string; project?: string },
) {
  if (!selectedProjectId) {
    return true;
  }

  if (selectedProjectId === operatingExpensesFilterValue) {
    return !reference.projectId && projectLabel(workspace.projects, reference) === generalOperationsProjectLabel;
  }

  if (selectedProjectId === generalFundFilterValue) {
    return !reference.projectId && projectLabel(workspace.projects, reference) === generalFundAllocationLabel;
  }

  const project = workspace.projects.find((item) => item.id === selectedProjectId);
  return project ? recordMatchesProject(project, reference) : false;
}

function reportExpenseProjectLabel(workspace: LocalWorkspace, reference: { projectId?: string; project?: string }) {
  if (!reference.projectId && projectLabel(workspace.projects, reference) === generalOperationsProjectLabel) {
    return "Operating Expenses";
  }

  return projectLabel(workspace.projects, reference);
}

function reportResult(
  type: ReportType,
  title: string,
  description: string,
  columns: ReportColumn[],
  rows: ReportRow[],
  summary: ReportSummaryItem[],
  filters: ReportFilters,
) {
  return {
    title,
    description,
    columns,
    rows,
    summary,
    csvFileName: `sukoonos-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
    payload: {
      title,
      description,
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      columns,
      rows,
    },
  } satisfies ReportResult;
}

export function generateReport(workspace: LocalWorkspace, type: ReportType, filters: ReportFilters): ReportResult {
  const ledger = buildFinanceLedger(workspace);
  const donorRows = deriveDonorRows(workspace.donors, workspace.donations);
  const projectRows = deriveProjectRows(workspace, ledger);
  const approvalRows = deriveApprovalRows(workspace);

  if (type === "monthly-donations") {
    const grouped = workspace.donations
      .filter((donation) =>
        donationImpactsBalances(donation) &&
        inDateRange(donation.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, donation) &&
        (filters.accountId ? donation.accountId === filters.accountId : true) &&
        (filters.donorId ? donation.donorId === filters.donorId : true) &&
        (filters.currency === "All" || donation.originalCurrency === filters.currency) &&
        (filters.status ? donation.status === filters.status : true),
      )
      .reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, donation) => {
        const key = monthKey(donation.date);
        const current = result[key] ?? { count: 0, pkr: 0, usd: 0 };
        const sign = donation.status === "Refunded" ? -1 : 1;
        current.count += 1;
        current.pkr += donation.pkrAmount * sign;
        current.usd += donation.usdAmount * sign;
        result[key] = current;
        return result;
      }, {});

    const rows = filterRowsBySearch(
      Object.entries(grouped)
        .sort((left, right) => right[0].localeCompare(left[0]))
        .map(([month, totals]) => ({
          month,
          donations: totals.count,
          pkrValue: formatMoney(totals.pkr, "PKR"),
          usdValue: formatMoney(totals.usd, "USD"),
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Monthly donations",
      "Received donations grouped by month with dual-currency totals.",
      [
        { key: "month", label: "Month" },
        { key: "donations", label: "Donations", align: "right" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
      ],
      rows,
      [{ label: "Visible months", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "monthly-expenses") {
    const grouped = workspace.expenses
      .filter((expense) =>
        expenseImpactsBalances(expense) &&
        inDateRange(expense.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, expense) &&
        (filters.accountId ? expense.fundingAccountId === filters.accountId : true) &&
        (filters.category ? expense.category === filters.category : true) &&
        (filters.status ? expense.approvalStatus === filters.status : true) &&
        (filters.currency === "All" || expense.originalCurrency === filters.currency),
      )
      .reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, expense) => {
        const key = monthKey(expense.date);
        const current = result[key] ?? { count: 0, pkr: 0, usd: 0 };
        const amounts = convertedExpenseAmounts(expense);
        current.count += 1;
        current.pkr += amounts.pkr;
        current.usd += amounts.usd;
        result[key] = current;
        return result;
      }, {});

    const rows = filterRowsBySearch(
      Object.entries(grouped)
        .sort((left, right) => right[0].localeCompare(left[0]))
        .map(([month, totals]) => ({
          month,
          expenses: totals.count,
          pkrValue: formatMoney(totals.pkr, "PKR"),
          usdValue: formatMoney(totals.usd, "USD"),
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Monthly expenses",
      "Expenses grouped by month with both PKR and USD values.",
      [
        { key: "month", label: "Month" },
        { key: "expenses", label: "Expenses", align: "right" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
      ],
      rows,
      [{ label: "Visible months", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "project-income-spending") {
    const rows = filterRowsBySearch(
      projectRows
        .filter((project) => (filters.projectId ? project.id === filters.projectId : true))
        .map((project) => ({
          project: project.name,
          donationsPkr: formatMoney(project.donationTotalPkr, "PKR"),
          donationsUsd: formatMoney(project.donationTotalUsd, "USD"),
          expensesPkr: formatMoney(project.expenseTotalPkr, "PKR"),
          expensesUsd: formatMoney(project.expenseTotalUsd, "USD"),
          remainingPkr: formatMoney(project.remainingPkr, "PKR"),
          remainingUsd: formatMoney(project.remainingUsd, "USD"),
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Project income and spending",
      "Linked donation, expense, and remaining-funds view by project.",
      [
        { key: "project", label: "Project" },
        { key: "donationsPkr", label: "Donations PKR", align: "right" },
        { key: "donationsUsd", label: "Donations USD", align: "right" },
        { key: "expensesPkr", label: "Expenses PKR", align: "right" },
        { key: "expensesUsd", label: "Expenses USD", align: "right" },
        { key: "remainingPkr", label: "Remaining PKR", align: "right" },
        { key: "remainingUsd", label: "Remaining USD", align: "right" },
      ],
      rows,
      [{ label: "Visible projects", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "expense-category-totals") {
    const grouped = workspace.expenses
      .filter((expense) =>
        expenseImpactsBalances(expense) &&
        inDateRange(expense.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, expense) &&
        (filters.accountId ? expense.fundingAccountId === filters.accountId : true) &&
        (filters.status ? expense.approvalStatus === filters.status : true) &&
        (filters.currency === "All" || expense.originalCurrency === filters.currency),
      )
      .reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, expense) => {
        const current = result[expense.category] ?? { count: 0, pkr: 0, usd: 0 };
        const amounts = convertedExpenseAmounts(expense);
        current.count += 1;
        current.pkr += amounts.pkr;
        current.usd += amounts.usd;
        result[expense.category] = current;
        return result;
      }, {});

    const rows = filterRowsBySearch(
      Object.entries(grouped)
        .sort((left, right) => right[1].usd - left[1].usd)
        .map(([category, totals]) => ({
          category,
          records: totals.count,
          pkrValue: formatMoney(totals.pkr, "PKR"),
          usdValue: formatMoney(totals.usd, "USD"),
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Expense category totals",
      "Spend totals grouped by expense category.",
      [
        { key: "category", label: "Category" },
        { key: "records", label: "Records", align: "right" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
      ],
      rows,
      [{ label: "Visible categories", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "account-balances") {
    const rows = filterRowsBySearch(
      workspace.financeAccounts
        .filter((account) =>
          (filters.accountId ? account.id === filters.accountId : true) &&
          (filters.currency === "All" || account.currency === filters.currency),
        )
        .map((account) => ({
          account: account.name,
          kind: account.kind,
          currency: account.currency,
          opening: formatMoney(account.openingBalance, account.currency),
          balance: formatMoney(accountBalanceFromLedger(account, ledger), account.currency),
          status: account.status,
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Account balances",
      "Opening balances and current derived balances by account.",
      [
        { key: "account", label: "Account" },
        { key: "kind", label: "Kind" },
        { key: "currency", label: "Currency" },
        { key: "opening", label: "Opening", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows,
      [{ label: "Visible accounts", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "transfer-history") {
    const rows = filterRowsBySearch(
      workspace.transfers
        .filter((transfer) =>
          transferImpactsBalances(transfer) &&
          inDateRange(transfer.date, filters) &&
          matchesProjectFilter(workspace, filters.projectId, transfer) &&
          (filters.status ? transfer.status === filters.status : true) &&
          (filters.currency === "All" || transfer.originalCurrency === filters.currency),
        )
        .map((transfer) => ({
          date: transfer.date,
          project: projectLabel(workspace.projects, transfer),
          from: accountName(workspace, transfer.fromAccountId),
          to: accountName(workspace, transfer.toAccountId),
          original: formatMoney(transfer.originalAmount, transfer.originalCurrency),
          pkrValue: formatMoney(transfer.pkrAmount, "PKR"),
          usdValue: formatMoney(transfer.usdAmount, "USD"),
          status: transfer.status,
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Transfer history",
      "Chronological transfer ledger with dual-currency values.",
      [
        { key: "date", label: "Date" },
        { key: "project", label: "Project" },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "original", label: "Original", align: "right" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows,
      [{ label: "Visible transfers", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "donor-giving") {
    const rows = filterRowsBySearch(
      donorRows
        .filter((donor) => (filters.donorId ? donor.id === filters.donorId : true))
        .map((donor) => ({
          donor: donor.fullName,
          donations: donor.donationCount,
          lastDonation: donor.lastDonationDate || "No donations yet",
          pkrValue: formatMoney(donor.lifetimePkr, "PKR"),
          usdValue: formatMoney(donor.lifetimeUsd, "USD"),
          projects: donor.projectsSupported.join(", ") || "None yet",
          reminder: donor.effectiveReminderStatus,
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Donor giving",
      "Derived donor lifetime giving, latest support, and linked project coverage.",
      [
        { key: "donor", label: "Donor" },
        { key: "donations", label: "Donations", align: "right" },
        { key: "lastDonation", label: "Last donation" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
        { key: "projects", label: "Projects supported" },
        { key: "reminder", label: "Reminder" },
      ],
      rows,
      [{ label: "Visible donors", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "missing-receipts") {
    const rows = filterRowsBySearch(
      [
        ...workspace.donations
          .filter((donation) =>
            inDateRange(donation.date, filters) &&
            !donation.receiptReference &&
            matchesProjectFilter(workspace, filters.projectId, donation) &&
            (filters.accountId ? donation.accountId === filters.accountId : true) &&
            (filters.donorId ? donation.donorId === filters.donorId : true),
          )
          .map((donation) => ({
            date: donation.date,
            type: "Donation",
            source: donorLabel(workspace.donors, donation),
            project: projectLabel(workspace.projects, donation),
            status: donation.status,
          })),
        ...workspace.expenses
          .filter((expense) =>
            inDateRange(expense.date, filters) &&
            !expense.receiptReference &&
            matchesProjectFilter(workspace, filters.projectId, expense) &&
            (filters.accountId ? expense.fundingAccountId === filters.accountId : true),
          )
          .map((expense) => ({
            date: expense.date,
            type: "Expense",
            source: expense.description || expense.category,
            project: reportExpenseProjectLabel(workspace, expense),
            status: expense.approvalStatus,
          })),
        ...workspace.transfers
          .filter((transfer) =>
            inDateRange(transfer.date, filters) &&
            !transfer.reference &&
            matchesProjectFilter(workspace, filters.projectId, transfer),
          )
          .map((transfer) => ({
            date: transfer.date,
            type: "Transfer",
            source: accountName(workspace, transfer.fromAccountId),
            project: projectLabel(workspace.projects, transfer),
            status: transfer.status,
          })),
      ],
      filters.search,
    );

    return reportResult(
      type,
      "Missing receipts",
      "Records that still need receipt references or transfer references.",
      [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "source", label: "Source" },
        { key: "project", label: "Project" },
        { key: "status", label: "Status" },
      ],
      rows,
      [{ label: "Visible missing receipts", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "missing-expense-proof") {
    const rows = filterRowsBySearch(
      workspace.expenses
        .filter((expense) =>
          inDateRange(expense.date, filters) &&
          !expenseHasProof(expense) &&
          matchesProjectFilter(workspace, filters.projectId, expense) &&
          (filters.accountId ? expense.fundingAccountId === filters.accountId : true) &&
          (filters.category ? expense.category === filters.category : true) &&
          (filters.status ? expense.approvalStatus === filters.status : true) &&
          (filters.currency === "All" || expense.originalCurrency === filters.currency),
        )
        .map((expense) => ({
          date: expense.date,
          description: expense.description || expense.category,
          project: reportExpenseProjectLabel(workspace, expense),
          category: expense.category,
          amountPkr: formatMoney(convertedExpenseAmounts(expense).pkr, "PKR"),
          amountUsd: formatMoney(convertedExpenseAmounts(expense).usd, "USD"),
          proofStatus: expenseProofStatusLabel(expense),
          attachmentFiles: expenseProofFileNames(expense).join(", ") || "None",
          status: expense.approvalStatus,
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Missing expense proof",
      "Expenses that still need receipt or proof attachments in the local workspace.",
      [
        { key: "date", label: "Date" },
        { key: "description", label: "Description" },
        { key: "project", label: "Project" },
        { key: "category", label: "Category" },
        { key: "amountPkr", label: "PKR value", align: "right" },
        { key: "amountUsd", label: "USD value", align: "right" },
        { key: "proofStatus", label: "Proof status" },
        { key: "attachmentFiles", label: "Attachment files" },
        { key: "status", label: "Status" },
      ],
      rows,
      [{ label: "Expenses missing proof", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "pending-approvals") {
    const rows = filterRowsBySearch(
      approvalRows
        .filter((approval) =>
          (filters.projectId ? approval.projectId === filters.projectId : true) &&
          (filters.projectId === operatingExpensesFilterValue ? approval.projectName === "Operating Expenses" : true) &&
          (filters.projectId === generalFundFilterValue ? approval.projectName === generalFundAllocationLabel : true) &&
          (filters.status ? approval.status === filters.status : true),
        )
        .map((approval) => ({
          requestedAt: approval.requestedAt,
          sourceType: approval.sourceType,
          title: approval.title,
          project: approval.projectName,
          requestedBy: approval.requestedBy,
          notes: approval.notes || "No notes",
        })),
      filters.search,
    );

    return reportResult(
      type,
      "Pending approvals",
      "Open expense, transfer, and project update approvals.",
      [
        { key: "requestedAt", label: "Requested" },
        { key: "sourceType", label: "Source" },
        { key: "title", label: "Title" },
        { key: "project", label: "Project" },
        { key: "requestedBy", label: "Requested by" },
        { key: "notes", label: "Notes" },
      ],
      rows,
      [{ label: "Visible approvals", value: String(rows.length) }],
      filters,
    );
  }

  if (type === "dual-currency-totals") {
    const totals = {
      donations: { pkr: 0, usd: 0 },
      expenses: { pkr: 0, usd: 0 },
      transfers: { pkr: 0, usd: 0 },
    };

    for (const donation of workspace.donations) {
      if (
        donationImpactsBalances(donation) &&
        inDateRange(donation.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, donation) &&
        (!filters.accountId || donation.accountId === filters.accountId) &&
        (!filters.donorId || donation.donorId === filters.donorId) &&
        (filters.currency === "All" || donation.originalCurrency === filters.currency)
      ) {
        const sign = donation.status === "Refunded" ? -1 : 1;
        totals.donations.pkr += donation.pkrAmount * sign;
        totals.donations.usd += donation.usdAmount * sign;
      }
    }

    for (const expense of workspace.expenses) {
      if (
        expenseImpactsBalances(expense) &&
        inDateRange(expense.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, expense) &&
        (!filters.accountId || expense.fundingAccountId === filters.accountId) &&
        (!filters.category || expense.category === filters.category) &&
        (!filters.status || expense.approvalStatus === filters.status) &&
        (filters.currency === "All" || expense.originalCurrency === filters.currency)
      ) {
        const amounts = convertedExpenseAmounts(expense);
        totals.expenses.pkr += amounts.pkr;
        totals.expenses.usd += amounts.usd;
      }
    }

    for (const transfer of workspace.transfers) {
      if (
        transferImpactsBalances(transfer) &&
        inDateRange(transfer.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, transfer) &&
        (!filters.status || transfer.status === filters.status) &&
        (filters.currency === "All" || transfer.originalCurrency === filters.currency)
      ) {
        totals.transfers.pkr += transfer.pkrAmount;
        totals.transfers.usd += transfer.usdAmount;
      }
    }

    const rows = [
      {
        type: "Donations",
        pkrValue: formatMoney(totals.donations.pkr, "PKR"),
        usdValue: formatMoney(totals.donations.usd, "USD"),
      },
      {
        type: "Expenses",
        pkrValue: formatMoney(totals.expenses.pkr, "PKR"),
        usdValue: formatMoney(totals.expenses.usd, "USD"),
      },
      {
        type: "Transfers",
        pkrValue: formatMoney(totals.transfers.pkr, "PKR"),
        usdValue: formatMoney(totals.transfers.usd, "USD"),
      },
    ];

    return reportResult(
      type,
      "Dual-currency totals",
      "Side-by-side PKR and USD totals across major finance movements.",
      [
        { key: "type", label: "Movement type" },
        { key: "pkrValue", label: "PKR value", align: "right" },
        { key: "usdValue", label: "USD value", align: "right" },
      ],
      filterRowsBySearch(rows, filters.search),
      [{ label: "Movement groups", value: "3" }],
      filters,
    );
  }

  const grouped = {
    donations: workspace.donations.reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, donation) => {
      if (
        donationImpactsBalances(donation) &&
        inDateRange(donation.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, donation) &&
        (!filters.donorId || donation.donorId === filters.donorId)
      ) {
        const key = yearKey(donation.date);
        const current = result[key] ?? { count: 0, pkr: 0, usd: 0 };
        const sign = donation.status === "Refunded" ? -1 : 1;
        current.count += 1;
        current.pkr += donation.pkrAmount * sign;
        current.usd += donation.usdAmount * sign;
        result[key] = current;
      }
      return result;
    }, {}),
    expenses: workspace.expenses.reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, expense) => {
      if (
        expenseImpactsBalances(expense) &&
        inDateRange(expense.date, filters) &&
        matchesProjectFilter(workspace, filters.projectId, expense) &&
        (!filters.category || expense.category === filters.category)
      ) {
        const key = yearKey(expense.date);
        const current = result[key] ?? { count: 0, pkr: 0, usd: 0 };
        const amounts = convertedExpenseAmounts(expense);
        current.count += 1;
        current.pkr += amounts.pkr;
        current.usd += amounts.usd;
        result[key] = current;
      }
      return result;
    }, {}),
    transfers: workspace.transfers.reduce<Record<string, { count: number; pkr: number; usd: number }>>((result, transfer) => {
      if (transferImpactsBalances(transfer) && inDateRange(transfer.date, filters) && matchesProjectFilter(workspace, filters.projectId, transfer)) {
        const key = yearKey(transfer.date);
        const current = result[key] ?? { count: 0, pkr: 0, usd: 0 };
        current.count += 1;
        current.pkr += transfer.pkrAmount;
        current.usd += transfer.usdAmount;
        result[key] = current;
      }
      return result;
    }, {}),
  };

  const years = Array.from(
    new Set([...Object.keys(grouped.donations), ...Object.keys(grouped.expenses), ...Object.keys(grouped.transfers)]),
  ).sort((left, right) => right.localeCompare(left));

  const rows = filterRowsBySearch(
    years.map((year) => ({
      year,
      donationCount: grouped.donations[year]?.count ?? 0,
      donationUsd: formatMoney(grouped.donations[year]?.usd ?? 0, "USD"),
      expenseCount: grouped.expenses[year]?.count ?? 0,
      expenseUsd: formatMoney(grouped.expenses[year]?.usd ?? 0, "USD"),
      transferCount: grouped.transfers[year]?.count ?? 0,
      transferUsd: formatMoney(grouped.transfers[year]?.usd ?? 0, "USD"),
    })),
    filters.search,
  );

  return reportResult(
    type,
    "Annual charity finance summary",
    "Yearly donation, expense, and transfer totals for charity operations.",
    [
      { key: "year", label: "Year" },
      { key: "donationCount", label: "Donations", align: "right" },
      { key: "donationUsd", label: "Donation USD", align: "right" },
      { key: "expenseCount", label: "Expenses", align: "right" },
      { key: "expenseUsd", label: "Expense USD", align: "right" },
      { key: "transferCount", label: "Transfers", align: "right" },
      { key: "transferUsd", label: "Transfer USD", align: "right" },
    ],
    rows,
    [{ label: "Visible years", value: String(rows.length) }],
    filters,
  );
}
