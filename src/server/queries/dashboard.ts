import { isDemoMode } from "@/config/runtime";
import { demoDashboardData, demoProjects } from "@/data/demo-data";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate, statusLabel } from "@/server/db/format";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

export async function getDashboardData() {
  if (isDemoMode) {
    return demoDashboardData;
  }

  const now = new Date();
  const currentMonth = startOfMonth(now);
  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [
    bankAccounts,
    monthlyDonations,
    monthlyExpenses,
    activeProjects,
    donationRows,
    expenseGroups,
    recentActivity,
    todaysTasks,
  ] = await Promise.all([
    prisma.bankAccount.findMany({ where: { isActive: true }, select: { balanceCents: true } }),
    prisma.donation.aggregate({
      _sum: { amountCents: true },
      where: { status: "RECEIVED", receivedAt: { gte: currentMonth } },
    }),
    prisma.expense.aggregate({
      _sum: { amountCents: true },
      where: { status: { in: ["APPROVED", "PAID"] }, submittedAt: { gte: currentMonth } },
    }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.donation.findMany({
      where: { status: "RECEIVED", receivedAt: { gte: sevenMonthsAgo } },
      select: { amountCents: true, receivedAt: true },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amountCents: true },
      where: { status: { in: ["APPROVED", "PAID"] } },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 5,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, type: true, action: true, message: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: {
        completedAt: null,
        OR: [{ dueDate: null }, { dueDate: { lt: tomorrow } }],
      },
      include: { assignee: { select: { fullName: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  const balanceCents = bankAccounts.reduce((total, account) => total + account.balanceCents, 0);
  const donationTotalCents = monthlyDonations._sum.amountCents ?? 0;
  const expenseTotalCents = monthlyExpenses._sum.amountCents ?? 0;

  const monthBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: monthLabel(date),
      cents: 0,
    };
  });

  for (const donation of donationRows) {
    const date = donation.receivedAt;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = monthBuckets.find((item) => item.key === key);
    if (bucket) {
      bucket.cents += donation.amountCents;
    }
  }

  const maxDonation = Math.max(...monthBuckets.map((item) => item.cents), 1);
  const totalExpenseCents = expenseGroups.reduce((total, item) => total + (item._sum.amountCents ?? 0), 0);

  return {
    fundsDeployedPercent: donationTotalCents ? Math.min(100, Math.round((expenseTotalCents / donationTotalCents) * 100)) : 0,
    stats: [
      {
        label: "Bank Balance",
        value: formatCurrency(balanceCents),
        change: `${bankAccounts.length} active`,
        detail: "Connected charity accounts",
        icon: "bank",
      },
      {
        label: "Total Donations",
        value: formatCurrency(donationTotalCents),
        change: "This month",
        detail: "Received donations",
        icon: "donations",
      },
      {
        label: "Total Expenses",
        value: formatCurrency(expenseTotalCents),
        change: "This month",
        detail: "Approved and paid",
        icon: "expenses",
      },
      {
        label: "Active Projects",
        value: String(activeProjects),
        change: "Live",
        detail: "Currently active",
        icon: "projects",
      },
    ],
    donationTrend: monthBuckets.map((item) => ({
      label: item.label,
      value: Math.max(4, Math.round((item.cents / maxDonation) * 100)),
    })),
    expenseBreakdown: expenseGroups.map((item, index) => {
      const cents = item._sum.amountCents ?? 0;
      return {
        label: item.category,
        value: totalExpenseCents ? Math.round((cents / totalExpenseCents) * 100) : 0,
        color: ["bg-emerald-600", "bg-teal-500", "bg-lime-500", "bg-slate-500", "bg-amber-500"][index] ?? "bg-slate-500",
      };
    }),
    recentActivity: recentActivity.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.action,
      description: activity.message,
      time: formatDate(activity.createdAt),
    })),
    todaysTasks: todaysTasks.map((task) => ({
      id: task.id,
      task: task.title,
      owner: task.assignee?.fullName ?? "Unassigned",
      priority: task.priority,
    })),
  };
}

export async function getProjects() {
  if (isDemoMode) {
    return demoProjects;
  }

  const projects = await prisma.project.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    lead: project.leadName,
    budget: formatCurrency(project.budgetCents),
    spent: formatCurrency(project.spentCents),
    progress: project.progress,
    status: statusLabel(project.status),
  }));
}
