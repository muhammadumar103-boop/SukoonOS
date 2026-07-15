import { buildFinanceLedger } from "@/lib/finance/ledger";
import { convertedExpenseAmounts, formatMoney } from "@/lib/finance/local-finance";
import { deriveDonorRows } from "@/lib/local-data/donors";
import { donationImpactsBalances, expenseImpactsBalances } from "@/lib/local-data/finance-rules";
import { deriveProjectRows } from "@/lib/local-data/projects";
import { deriveAccountBalanceRows, deriveApprovalRows, deriveTaskRows } from "@/lib/local-data/workflows";
import type { LocalWorkspace } from "@/lib/local-data/schema";

type DashboardActivity = {
  id: string;
  type: "DONATION" | "EXPENSE" | "TRANSFER" | "TASK" | "DONOR" | "PROJECT" | "REPORT" | "SETTING";
  title: string;
  description: string;
  time: string;
  sortKey: string;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function normalizeValue(value: number, max: number) {
  if (max <= 0) {
    return 4;
  }

  return Math.max(4, Math.round((value / max) * 100));
}

export function deriveDashboardData(workspace: LocalWorkspace) {
  const ledger = buildFinanceLedger(workspace);
  const donorRows = deriveDonorRows(workspace.donors, workspace.donations);
  const taskRows = deriveTaskRows(workspace);
  const approvalRows = deriveApprovalRows(workspace);
  const projectRows = deriveProjectRows(workspace, ledger);
  const activeProjects = projectRows.filter((project) => !project.archivedAt && !["Completed", "Paused"].includes(project.status));
  const currentMonth = currentMonthKey();

  const receivedDonations = workspace.donations.filter(donationImpactsBalances);
  const approvedExpenses = workspace.expenses.filter(expenseImpactsBalances);
  const thisMonthDonations = receivedDonations.filter((donation) => donation.date.startsWith(currentMonth));
  const thisMonthExpenses = approvedExpenses.filter((expense) => expense.date.startsWith(currentMonth));
  const overdueDonors = donorRows.filter((donor) => donor.effectiveReminderStatus === "Overdue");
  const accountBalances = deriveAccountBalanceRows(workspace).map((account) => ({
    ...account,
    movementTotal: account.balance - account.openingBalance,
  }));

  const totalBankBalance = accountBalances.reduce(
    (result, account) => {
      result[account.currency] += account.balance;
      return result;
    },
    { PKR: 0, USD: 0 },
  );

  const totalDonations = receivedDonations.reduce(
    (result, donation) => {
      const sign = donation.status === "Refunded" ? -1 : 1;
      result.PKR += donation.pkrAmount * sign;
      result.USD += donation.usdAmount * sign;
      return result;
    },
    { PKR: 0, USD: 0 },
  );

  const totalExpenses = approvedExpenses.reduce(
    (result, expense) => {
      const amounts = convertedExpenseAmounts(expense);
      result.PKR += amounts.pkr;
      result.USD += amounts.usd;
      return result;
    },
    { PKR: 0, USD: 0 },
  );

  const thisMonthDonationTotals = thisMonthDonations.reduce(
    (result, donation) => {
      const sign = donation.status === "Refunded" ? -1 : 1;
      result.PKR += donation.pkrAmount * sign;
      result.USD += donation.usdAmount * sign;
      return result;
    },
    { PKR: 0, USD: 0 },
  );

  const thisMonthExpenseTotals = thisMonthExpenses.reduce(
    (result, expense) => {
      const amounts = convertedExpenseAmounts(expense);
      result.PKR += amounts.pkr;
      result.USD += amounts.usd;
      return result;
    },
    { PKR: 0, USD: 0 },
  );

  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: monthLabel(date),
      pkr: 0,
      usd: 0,
    };
  });

  for (const donation of receivedDonations) {
    const bucket = monthBuckets.find((item) => item.key === donation.date.slice(0, 7));
    if (bucket) {
      const sign = donation.status === "Refunded" ? -1 : 1;
      bucket.usd += donation.usdAmount * sign;
      bucket.pkr += donation.pkrAmount * sign;
    }
  }

  const maxBucket = Math.max(...monthBuckets.map((item) => item.usd), 0);
  const donationTrend = monthBuckets.map((item) => ({
    label: item.label,
    value: normalizeValue(item.usd, maxBucket),
  }));

  const expenseCategoryTotals = approvedExpenses.reduce<Record<string, number>>((result, expense) => {
    const amounts = convertedExpenseAmounts(expense);
    result[expense.category] = (result[expense.category] ?? 0) + amounts.usd;
    return result;
  }, {});
  const expenseTotalUsd = Object.values(expenseCategoryTotals).reduce((sum, value) => sum + value, 0);
  const expenseBreakdown = Object.entries(expenseCategoryTotals)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value: expenseTotalUsd ? Math.round((value / expenseTotalUsd) * 100) : 0,
      color: ["bg-emerald-600", "bg-teal-500", "bg-lime-500", "bg-slate-500", "bg-amber-500"][index] ?? "bg-slate-500",
      amountLabel: formatMoney(value, "USD"),
    }));

  const fundsDeployedPercent = thisMonthDonationTotals.USD
    ? Math.min(100, Math.round((thisMonthExpenseTotals.USD / thisMonthDonationTotals.USD) * 100))
    : 0;

  const activityFromLedger: DashboardActivity[] = ledger.slice(0, 6).map((entry) => ({
    id: `ledger-${entry.id}`,
    type: entry.type === "Donation" || entry.type === "Refund" ? "DONATION" : entry.type === "Expense" || entry.type === "Fee" ? "EXPENSE" : "TRANSFER",
    title: entry.description,
    description: `${entry.project} · ${entry.originalLabel} · ${entry.status}`,
    time: entry.date,
    sortKey: entry.date,
  }));

  const activityFromAudit: DashboardActivity[] = workspace.auditLog.slice(0, 6).map((entry) => ({
    id: `audit-${entry.id}`,
    type:
      entry.entityType === "project"
        ? "PROJECT"
        : entry.entityType === "donor"
          ? "DONOR"
          : entry.entityType === "workspace"
            ? "SETTING"
            : "TASK",
    title: `${entry.action[0]?.toUpperCase() ?? ""}${entry.action.slice(1)} ${entry.entityType}`,
    description: `${entry.actor} updated ${entry.entityType} ${entry.entityId}.`,
    time: entry.createdAt.slice(0, 10),
    sortKey: entry.createdAt,
  }));

  const recentActivity = [...activityFromAudit, ...activityFromLedger]
    .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
    .slice(0, 6)
    .map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      time: activity.time,
    }));

  const projectsOverBudget = projectRows.filter((project) => project.remainingPkr < 0 || project.remainingUsd < 0);

  return {
    accountBalances,
    approvalRows,
    currentMonth,
    donorRows,
    donationTrend,
    expenseBreakdown,
    fundsDeployedPercent,
    overdueDonors,
    projectRows,
    projectsOverBudget,
    recentActivity,
    stats: [
      {
        label: "Bank Balance",
        value: `${formatMoney(totalBankBalance.PKR, "PKR")} / ${formatMoney(totalBankBalance.USD, "USD")}`,
        change: `${accountBalances.length} accounts`,
        detail: "Across bank and cash",
        icon: "bank",
      },
      {
        label: "Total Donations",
        value: `${formatMoney(totalDonations.PKR, "PKR")} / ${formatMoney(totalDonations.USD, "USD")}`,
        change: `${thisMonthDonations.length} this month`,
        detail: "Received donations only",
        icon: "donations",
      },
      {
        label: "Total Expenses",
        value: `${formatMoney(totalExpenses.PKR, "PKR")} / ${formatMoney(totalExpenses.USD, "USD")}`,
        change: `${thisMonthExpenses.length} this month`,
        detail: "Approved and paid only",
        icon: "expenses",
      },
      {
        label: "Active Projects",
        value: String(activeProjects.length),
        change: `${projectsOverBudget.length} over budget`,
        detail: "Open program work",
        icon: "projects",
      },
      {
        label: "Pending Approvals",
        value: String(approvalRows.length),
        change: `${workspace.approvals.filter((approval) => approval.status === "Pending").length} project updates`,
        detail: "Expenses, transfers, and project updates",
        icon: "approvals",
      },
      {
        label: "Upcoming Tasks",
        value: String(taskRows.length),
        change: `${overdueDonors.length} overdue donor reminders`,
        detail: "Manual tasks and reminders",
        icon: "tasks",
      },
    ],
    summary: {
      activeProjects: activeProjects.length,
      donationsThisMonthPkr: thisMonthDonationTotals.PKR,
      donationsThisMonthUsd: thisMonthDonationTotals.USD,
      expensesThisMonthPkr: thisMonthExpenseTotals.PKR,
      expensesThisMonthUsd: thisMonthExpenseTotals.USD,
      overdueDonorUpdates: overdueDonors.length,
      pendingApprovals: approvalRows.length,
      tasksOpen: taskRows.length,
    },
    taskRows,
  };
}
