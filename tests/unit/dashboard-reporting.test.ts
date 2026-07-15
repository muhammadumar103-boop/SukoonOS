import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/finance/local-finance";
import { deriveDashboardData } from "@/lib/local-data/dashboard";
import { createSampleWorkspace } from "@/lib/local-data/migrations";
import { generateReport } from "@/lib/local-data/reporting";

describe("dashboard and reporting totals", () => {
  it("derives donation totals from final workspace records only", () => {
    const workspace = createSampleWorkspace({
      expenses: [
        {
          id: "expense-approved",
          date: "2026-07-15",
          originalAmount: 1000,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Approved food spend",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-1",
          approvalStatus: "Approved",
          notes: "",
        },
        {
          id: "expense-pending",
          date: "2026-07-15",
          originalAmount: 500,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Pending food spend",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-2",
          approvalStatus: "Pending",
          notes: "",
        },
      ],
    });

    const dashboard = deriveDashboardData(workspace);
    const donationsStat = dashboard.stats.find((stat) => stat.label === "Total Donations");
    const expensesStat = dashboard.stats.find((stat) => stat.label === "Total Expenses");

    expect(donationsStat?.value).toContain("$23,250.00");
    expect(expensesStat?.value).toContain(formatMoney(1000, "PKR"));
    expect(dashboard.summary.pendingApprovals).toBeGreaterThan(0);
  });

  it("keeps monthly donation and expense reports aligned with final statuses", () => {
    const workspace = createSampleWorkspace({
      expenses: [
        {
          id: "expense-approved",
          date: "2026-07-15",
          originalAmount: 1000,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Approved food spend",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-1",
          approvalStatus: "Approved",
          notes: "",
        },
        {
          id: "expense-voided",
          date: "2026-07-15",
          originalAmount: 2000,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Voided food spend",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-2",
          approvalStatus: "Voided",
          notes: "",
        },
      ],
    });

    const monthlyDonations = generateReport(workspace, "monthly-donations", {
      accountId: "",
      category: "",
      currency: "All",
      dateFrom: "",
      dateTo: "",
      donorId: "",
      projectId: "",
      search: "",
      status: "",
    });
    const monthlyExpenses = generateReport(workspace, "monthly-expenses", {
      accountId: "",
      category: "",
      currency: "All",
      dateFrom: "",
      dateTo: "",
      donorId: "",
      projectId: "",
      search: "",
      status: "",
    });

    expect(monthlyDonations.rows[0]).toMatchObject({
      donations: 3,
      usdValue: "$23,250.00",
    });
    expect(monthlyExpenses.rows[0]).toMatchObject({
      expenses: 1,
      pkrValue: formatMoney(1000, "PKR"),
    });
  });
});
