import { describe, expect, it } from "vitest";
import { deriveDonorRows } from "@/lib/local-data/donors";
import { deriveProjectRows } from "@/lib/local-data/projects";
import { generateReport } from "@/lib/local-data/reporting";
import {
  createWorkspaceBackup,
  exportLocalWorkspace,
  importLocalWorkspace,
  loadLocalWorkspace,
  resetLocalWorkspace,
  saveAuditedWorkspace,
  saveLocalWorkspace,
} from "@/lib/local-data/repository";
import { createEmptyWorkspace } from "@/lib/local-data/migrations";
import { donorLinkCounts, projectLinkCounts } from "@/lib/local-data/integrity";
import { deriveApprovalRows, deriveTaskRows } from "@/lib/local-data/workflows";
import { buildFinanceLedger } from "@/lib/finance/ledger";
import { createMemoryStorage } from "../helpers/storage";

describe("local workspace workflows", () => {
  it("supports donor, project, donation, expense, transfer, task, and approval flows in demo storage", () => {
    const storage = createMemoryStorage();
    let workspace = createEmptyWorkspace();

    workspace = saveAuditedWorkspace(
      {
        ...workspace,
        donors: [
          {
            id: "donor-1",
            fullName: "Amina Khan",
            phone: "",
            whatsapp: "",
            email: "amina@example.com",
            country: "Pakistan",
            preferredContactMethod: "Email",
            donorType: "Individual",
            givingPreferences: ["Food Parcels"],
            zakatPreference: "General",
            recurringDonor: false,
            notes: "",
            taxReceiptStatus: "Pending",
            updateHistory: [],
            nextUpdateDueDate: "2026-07-20",
            reminderStatus: "Upcoming",
          },
        ],
      },
      {
        entityType: "donor",
        entityId: "donor-1",
        action: "created",
        actor: "Test Runner",
        metadata: {},
      },
      storage,
    );

    workspace = saveAuditedWorkspace(
      {
        ...workspace,
        projects: [
          {
            id: "project-1",
            name: "Food Parcels",
            projectType: "Food Parcels",
            location: "Karachi",
            status: "Active",
            startDate: "2026-07-01",
            targetCompletionDate: "",
            budgetPkr: 50000,
            budgetUsd: 0,
            beneficiaries: 100,
            responsibleStaff: "Ayesha Khan",
            progress: 20,
            notes: "",
            timeline: [],
            mediaPlaceholders: [],
            documentPlaceholders: [],
            donorUpdates: [],
            completionReport: "",
            archivedAt: "",
          },
        ],
      },
      {
        entityType: "project",
        entityId: "project-1",
        action: "created",
        actor: "Test Runner",
        metadata: {},
      },
      storage,
    );

    workspace = saveLocalWorkspace(
      {
        ...workspace,
        donations: [
          {
            id: "donation-1",
            donorId: "donor-1",
            donorName: "Amina Khan",
            projectId: "project-1",
            project: "Food Parcels",
            accountId: workspace.financeAccounts[0]?.id ?? "main-donations-bank",
            method: "Bank Transfer",
            date: "2026-07-15",
            status: "Received",
            receiptReference: "DON-1001",
            notes: "",
            originalAmount: 500,
            originalCurrency: "USD",
            exchangeRate: 280,
            pkrAmount: 140000,
            usdAmount: 500,
          },
        ],
        expenses: [
          {
            id: "expense-1",
            date: "2026-07-15",
            originalAmount: 10000,
            originalCurrency: "PKR",
            exchangeRate: 280,
            category: "Food",
            projectId: "project-1",
            project: "Food Parcels",
            fundingAccountId: "operations-bank-pkr",
            description: "Food package procurement",
            paymentMethod: "Cash",
            paidBy: "Ops",
            receiptReference: "EXP-1001",
            approvalStatus: "Pending",
            notes: "",
          },
        ],
        transfers: [
          {
            id: "transfer-1",
            fromAccountId: "main-donations-bank",
            toAccountId: "operations-bank-pkr",
            projectId: "project-1",
            project: "Food Parcels",
            date: "2026-07-15",
            status: "Review",
            reference: "TRF-1001",
            notes: "",
            originalAmount: 100,
            originalCurrency: "USD",
            exchangeRate: 280,
            pkrAmount: 28000,
            usdAmount: 100,
          },
        ],
        tasks: [
          {
            id: "task-1",
            title: "Send donor update",
            dueDate: "2026-07-16",
            priority: "High",
            assignedUser: "Ayesha Khan",
            projectId: "project-1",
            status: "Open",
          },
        ],
        approvals: [
          {
            id: "approval-1",
            sourceType: "Project Update",
            sourceId: "project-1",
            status: "Pending",
            requestedBy: "Ayesha Khan",
            requestedAt: "2026-07-15",
            reviewedBy: "",
            reviewedAt: "",
            notes: "Need donor sign-off",
          },
        ],
      },
      storage,
    );

    const loaded = loadLocalWorkspace(storage);
    const donorRows = deriveDonorRows(loaded.donors, loaded.donations);
    const projectRows = deriveProjectRows(loaded, buildFinanceLedger(loaded));
    const taskRows = deriveTaskRows(loaded);
    const approvalRows = deriveApprovalRows(loaded);

    expect(donorRows[0]?.lifetimeUsd).toBe(500);
    expect(projectRows[0]?.donationTotalUsd).toBe(500);
    expect(taskRows.map((task) => task.title)).toContain("Send donor update");
    expect(approvalRows.map((approval) => approval.sourceType)).toEqual(expect.arrayContaining(["Expense", "Transfer", "Project Update"]));
    expect(donorLinkCounts(loaded, "donor-1").donations).toBe(1);
    expect(projectLinkCounts(loaded, "project-1").donations).toBe(1);
    expect(loaded.auditLog.length).toBeGreaterThanOrEqual(2);
  });

  it("round-trips empty and sample workspaces through export and import", () => {
    const emptyStorage = createMemoryStorage();
    saveLocalWorkspace(createEmptyWorkspace(), emptyStorage);
    const emptyExport = exportLocalWorkspace(emptyStorage);
    resetLocalWorkspace({ sampleData: false }, emptyStorage);
    importLocalWorkspace(emptyExport, emptyStorage);
    const emptyImported = loadLocalWorkspace(emptyStorage);

    expect(emptyImported.sampleDataEnabled).toBe(false);
    expect(emptyImported.donations).toHaveLength(0);

    const sampleStorage = createMemoryStorage();
    const sampleBaseline = loadLocalWorkspace(sampleStorage);
    createWorkspaceBackup("before-roundtrip", sampleStorage);
    const sampleExport = exportLocalWorkspace(sampleStorage);
    resetLocalWorkspace({ sampleData: true }, sampleStorage);
    importLocalWorkspace(sampleExport, sampleStorage);
    const sampleImported = loadLocalWorkspace(sampleStorage);
    const report = generateReport(sampleImported, "monthly-donations", {
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

    expect(sampleImported.sampleDataEnabled).toBe(true);
    expect(sampleImported.financialRecords).toHaveLength(sampleBaseline.financialRecords.length);
    expect(report.rows.length).toBeGreaterThan(0);
  });
});
