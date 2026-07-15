import { describe, expect, it } from "vitest";
import { accountBalanceFromLedger, buildFinanceLedger } from "@/lib/finance/ledger";
import { createEmptyWorkspace } from "@/lib/local-data/migrations";

describe("ledger projections", () => {
  it("derives account balances from final movements only", () => {
    const workspace = createEmptyWorkspace();
    workspace.financeAccounts = [
      {
        id: "main-donations-bank",
        name: "Main Donations Bank",
        kind: "Bank",
        currency: "USD",
        institution: "",
        purpose: "",
        openingBalance: 1000,
        status: "Active",
      },
      {
        id: "operations-bank-pkr",
        name: "Operations Bank PKR",
        kind: "Bank",
        currency: "PKR",
        institution: "",
        purpose: "",
        openingBalance: 100000,
        status: "Active",
      },
    ];
    workspace.donations = [
      {
        id: "donation-1",
        donorId: "donor-1",
        donorName: "Donor",
        projectId: "project-1",
        project: "Food Parcels",
        accountId: "main-donations-bank",
        method: "Bank Transfer",
        date: "2026-07-15",
        status: "Received",
        receiptReference: "DON-1",
        notes: "",
        originalAmount: 200,
        originalCurrency: "USD",
        exchangeRate: 280,
        pkrAmount: 56000,
        usdAmount: 200,
      },
      {
        id: "donation-2",
        donorId: "donor-2",
        donorName: "Pending donor",
        projectId: "project-1",
        project: "Food Parcels",
        accountId: "main-donations-bank",
        method: "Bank Transfer",
        date: "2026-07-15",
        status: "Processing",
        receiptReference: "DON-2",
        notes: "",
        originalAmount: 999,
        originalCurrency: "USD",
        exchangeRate: 280,
        pkrAmount: 279720,
        usdAmount: 999,
      },
    ];
    workspace.expenses = [
      {
        id: "expense-1",
        date: "2026-07-15",
        originalAmount: 100,
        originalCurrency: "USD",
        exchangeRate: 300,
        category: "Food",
        projectId: "project-1",
        project: "Food Parcels",
        fundingAccountId: "main-donations-bank",
        description: "Approved expense",
        paymentMethod: "Card",
        paidBy: "Ops",
        receiptReference: "EXP-1",
        transferReference: "",
        approvalStatus: "Approved",
        proofNotes: "",
        notes: "",
        attachments: [],
      },
      {
        id: "expense-2",
        date: "2026-07-15",
        originalAmount: 80,
        originalCurrency: "USD",
        exchangeRate: 300,
        category: "Food",
        projectId: "project-1",
        project: "Food Parcels",
        fundingAccountId: "main-donations-bank",
        description: "Pending expense",
        paymentMethod: "Card",
        paidBy: "Ops",
        receiptReference: "EXP-2",
        transferReference: "",
        approvalStatus: "Pending",
        proofNotes: "",
        notes: "",
        attachments: [],
      },
    ];
    workspace.transfers = [
      {
        id: "transfer-1",
        fromAccountId: "main-donations-bank",
        toAccountId: "operations-bank-pkr",
        projectId: "project-1",
        project: "Food Parcels",
        date: "2026-07-15",
        status: "Completed",
        reference: "TRF-1",
        notes: "",
        originalAmount: 50,
        originalCurrency: "USD",
        exchangeRate: 300,
        pkrAmount: 15000,
        usdAmount: 50,
      },
      {
        id: "transfer-2",
        fromAccountId: "main-donations-bank",
        toAccountId: "operations-bank-pkr",
        projectId: "project-1",
        project: "Food Parcels",
        date: "2026-07-15",
        status: "Scheduled",
        reference: "TRF-2",
        notes: "",
        originalAmount: 30,
        originalCurrency: "USD",
        exchangeRate: 300,
        pkrAmount: 9000,
        usdAmount: 30,
      },
    ];
    workspace.financialRecords = [
      {
        id: "fee-1",
        type: "Fee",
        accountId: "operations-bank-pkr",
        projectId: "project-1",
        project: "Food Parcels",
        date: "2026-07-15",
        status: "Posted",
        description: "Bank fee",
        party: "Bank",
        method: "Bank Transfer",
        reference: "FEE-1",
        notes: "",
        originalAmount: 1500,
        originalCurrency: "PKR",
        exchangeRate: 300,
        pkrAmount: 1500,
        usdAmount: 5,
      },
    ];

    const ledger = buildFinanceLedger(workspace);
    const usdAccount = workspace.financeAccounts[0];
    const pkrAccount = workspace.financeAccounts[1];

    expect(accountBalanceFromLedger(usdAccount, ledger)).toBe(1050);
    expect(accountBalanceFromLedger(pkrAccount, ledger)).toBe(113500);
  });
});
