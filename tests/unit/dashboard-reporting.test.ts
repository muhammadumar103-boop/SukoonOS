import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/finance/local-finance";
import { deriveDashboardData } from "@/lib/local-data/dashboard";
import { createSampleWorkspace, migrateLocalWorkspace } from "@/lib/local-data/migrations";
import { generateReport, generalFundFilterValue, operatingExpensesFilterValue } from "@/lib/local-data/reporting";

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
          transferReference: "",
          approvalStatus: "Approved",
          proofNotes: "",
          notes: "",
          attachments: [],
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
          transferReference: "",
          approvalStatus: "Pending",
          proofNotes: "",
          notes: "",
          attachments: [],
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
          transferReference: "",
          approvalStatus: "Approved",
          proofNotes: "",
          notes: "",
          attachments: [],
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
          transferReference: "",
          approvalStatus: "Voided",
          proofNotes: "",
          notes: "",
          attachments: [],
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

  it("lists expenses missing proof attachments in the proof report", () => {
    const workspace = createSampleWorkspace({
      expenses: [
        {
          id: "expense-missing-proof",
          date: "2026-07-15",
          originalAmount: 2200,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Needs proof upload",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-3",
          transferReference: "",
          approvalStatus: "Approved",
          proofNotes: "",
          notes: "",
          attachments: [],
        },
        {
          id: "expense-with-proof",
          date: "2026-07-15",
          originalAmount: 1800,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Food",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          fundingAccountId: "operations-bank-pkr",
          description: "Already documented",
          paymentMethod: "Cash",
          paidBy: "Ops",
          receiptReference: "EXP-4",
          transferReference: "",
          approvalStatus: "Approved",
          proofNotes: "",
          notes: "",
          attachments: [
            {
              id: "proof-1",
              fileName: "receipt.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 1200,
              kind: "Image",
              storedAt: "2026-07-15T00:00:00.000Z",
            },
          ],
        },
      ],
    });

    const report = generateReport(workspace, "missing-expense-proof", {
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

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      description: "Needs proof upload",
      proofStatus: "Missing proof",
      attachmentFiles: "None",
    });
  });

  it("ignores non-final transfers when deriving dashboard account balances", () => {
    const baselineWorkspace = createSampleWorkspace();
    const baselineDashboard = deriveDashboardData(baselineWorkspace);
    const workspace = migrateLocalWorkspace({
      ...createSampleWorkspace(),
      transfers: [
        ...baselineWorkspace.transfers,
        {
          id: "transfer-draft",
          fromAccountId: "main-donations-bank",
          toAccountId: "operations-bank-pkr",
          projectId: "project-food-parcels",
          project: "Food Parcels",
          date: "2026-07-15",
          status: "Review",
          reference: "TR-REVIEW",
          notes: "Awaiting approval",
          originalAmount: 250,
          originalCurrency: "USD",
          exchangeRate: 278,
          pkrAmount: 69500,
          usdAmount: 250,
        },
      ],
    });

    const dashboard = deriveDashboardData(workspace);
    const baselineUsdAccount = baselineDashboard.accountBalances.find((account) => account.id === "main-donations-bank");
    const baselinePkrAccount = baselineDashboard.accountBalances.find((account) => account.id === "operations-bank-pkr");
    const usdAccount = dashboard.accountBalances.find((account) => account.id === "main-donations-bank");
    const pkrAccount = dashboard.accountBalances.find((account) => account.id === "operations-bank-pkr");

    expect(usdAccount?.movementTotal).toBe(baselineUsdAccount?.movementTotal);
    expect(usdAccount?.balance).toBe(baselineUsdAccount?.balance);
    expect(pkrAccount?.movementTotal).toBe(baselinePkrAccount?.movementTotal);
    expect(pkrAccount?.balance).toBe(baselinePkrAccount?.balance);
  });

  it("treats projectless expenses as operating expenses and projectless donations as general fund in reports", () => {
    const sampleWorkspace = createSampleWorkspace();
    const workspace = migrateLocalWorkspace({
      ...sampleWorkspace,
      donations: [
        ...sampleWorkspace.donations,
        {
          id: "donation-general-fund",
          donorId: "donor-1",
          donorName: "General Fund Donor",
          projectId: "",
          project: "General Fund",
          accountId: "main-donations-bank",
          method: "Bank Transfer",
          date: "2026-07-15",
          status: "Received",
          receiptReference: "DON-GF-1",
          notes: "Unrestricted support",
          originalAmount: 250,
          originalCurrency: "USD",
          exchangeRate: 278,
          pkrAmount: 69500,
          usdAmount: 250,
        },
      ],
      expenses: [
        ...sampleWorkspace.expenses,
        {
          id: "expense-operating",
          date: "2026-07-15",
          originalAmount: 4500,
          originalCurrency: "PKR",
          exchangeRate: 278,
          category: "Utilities",
          projectId: "",
          project: "General Operations",
          fundingAccountId: "operations-bank-pkr",
          description: "Office electricity bill",
          paymentMethod: "Bank Transfer",
          paidBy: "Finance Team",
          receiptReference: "",
          transferReference: "",
          approvalStatus: "Approved",
          proofNotes: "",
          notes: "",
          attachments: [],
        },
      ],
    });

    const generalFundReport = generateReport(workspace, "monthly-donations", {
      accountId: "",
      category: "",
      currency: "All",
      dateFrom: "",
      dateTo: "",
      donorId: "",
      projectId: generalFundFilterValue,
      search: "",
      status: "",
    });
    const operatingExpenseReport = generateReport(workspace, "missing-expense-proof", {
      accountId: "",
      category: "",
      currency: "All",
      dateFrom: "",
      dateTo: "",
      donorId: "",
      projectId: operatingExpensesFilterValue,
      search: "",
      status: "",
    });
    const operatingProjectReport = generateReport(workspace, "project-income-spending", {
      accountId: "",
      category: "",
      currency: "All",
      dateFrom: "",
      dateTo: "",
      donorId: "",
      projectId: operatingExpensesFilterValue,
      search: "",
      status: "",
    });

    expect(generalFundReport.rows).toEqual([
      {
        month: "2026-07",
        donations: 1,
        pkrValue: formatMoney(69500, "PKR"),
        usdValue: "$250.00",
      },
    ]);
    expect(operatingExpenseReport.rows).toHaveLength(1);
    expect(operatingExpenseReport.rows[0]).toMatchObject({
      description: "Office electricity bill",
      project: "Operating Expenses",
      proofStatus: "Missing proof",
    });
    expect(operatingProjectReport.rows[0]).toMatchObject({
      project: "General Operations",
      expensesPkr: formatMoney(4500, "PKR"),
    });
  });
});
