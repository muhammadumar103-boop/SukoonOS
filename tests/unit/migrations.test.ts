import { describe, expect, it } from "vitest";
import { createEmptyWorkspace, migrateLocalWorkspace } from "@/lib/local-data/migrations";
import { localWorkspaceSchemaVersion } from "@/lib/local-data/schema";
import { localWorkspaceSchema } from "@/lib/local-data/validation";
import { sampleLocalFinancialRecords } from "@/lib/local-data/seeds";

describe("workspace migrations", () => {
  it("upgrades legacy sample workspaces to the latest schema with persisted financial records", () => {
    const migrated = migrateLocalWorkspace({
      sampleDataEnabled: true,
      schemaVersion: 1,
    });

    expect(migrated.schemaVersion).toBe(localWorkspaceSchemaVersion);
    expect(migrated.financialRecords).toHaveLength(sampleLocalFinancialRecords.length);
  });

  it("preserves legacy expense collections while assigning derived project links", () => {
    const migrated = migrateLocalWorkspace(
      {
        sampleDataEnabled: false,
        projects: [{ id: "project-hospital", name: "Hospital Project", projectType: "Hospital" }],
      },
      {
        expenses: [
          {
            id: "legacy-expense-1",
            amount: 2500,
            currency: "PKR",
            category: "Transport",
            project: "Hospital Project",
            paymentMethod: "Cash",
          },
        ],
      },
    );

    expect(migrated.expenses[0]?.originalAmount).toBe(2500);
    expect(migrated.expenses[0]?.category).toBe("Transportation");
    expect(migrated.expenses[0]?.projectId).toBe("project-hospital");
    expect(migrated.expenses[0]?.attachments).toEqual([]);
    expect(migrated.expenses[0]?.proofNotes).toBe("");
  });

  it("keeps an explicitly empty workspace empty during migration", () => {
    const migrated = migrateLocalWorkspace(createEmptyWorkspace());

    expect(migrated.sampleDataEnabled).toBe(false);
    expect(migrated.financeAccounts).toHaveLength(0);
    expect(migrated.financeBudgets).toHaveLength(0);
    expect(migrated.projects).toHaveLength(0);
    expect(migrated.donors).toHaveLength(0);
  });

  it("heals legacy cleared workspaces that still contain starter scaffolding", () => {
    const migrated = migrateLocalWorkspace({
      sampleDataEnabled: false,
      financeAccounts: [{ id: "main-donations-bank", name: "Main Donations Bank", currency: "USD" }],
      financeBudgets: [{ id: "budget-1", name: "Starter", project: "Food Parcels", category: "Food", period: "Monthly", currency: "PKR", amount: 1000 }],
      projects: [{ id: "project-food", name: "Food Parcels", projectType: "Food Parcels" }],
      donations: [],
      expenses: [],
      transfers: [],
      financialRecords: [],
      donors: [],
      tasks: [],
      approvals: [],
      reports: [],
      auditLog: [
        {
          id: "audit-1",
          createdAt: "2026-07-15T00:00:00.000Z",
          entityType: "workspace",
          entityId: "local",
          action: "cleared-sample-data",
          actor: "Local Demo User",
          metadata: {},
        },
      ],
    });

    expect(migrated.financeAccounts).toHaveLength(0);
    expect(migrated.financeBudgets).toHaveLength(0);
    expect(migrated.projects).toHaveLength(0);
  });

  it("accepts extended expense records with proof metadata", () => {
    const workspace = createEmptyWorkspace();

    expect(() =>
      localWorkspaceSchema.parse({
        ...workspace,
        expenses: [
          {
            id: "expense-1",
            date: "2026-07-15",
            originalAmount: 1500,
            originalCurrency: "PKR",
            exchangeRate: 278,
            category: "Food",
            projectId: "",
            project: "General Operations",
            fundingAccountId: "operations-bank-pkr",
            description: "Groceries",
            paymentMethod: "Cash",
            paidBy: "Ayesha",
            receiptReference: "EXP-1001",
            transferReference: "TRX-22",
            approvalStatus: "Approved",
            proofNotes: "Receipt attached.",
            notes: "",
            attachments: [],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("normalizes report definitions and drops malformed legacy report entries", () => {
    const migrated = migrateLocalWorkspace({
      sampleDataEnabled: false,
      reports: [
        {
          id: "report-1",
          name: "Monthly donations",
          reportType: "monthly-donations",
          filters: {
            currency: "USD",
            projectId: "project-water",
            invalid: 42,
          },
          updatedAt: "2026-07-15T00:00:00.000Z",
          ignored: "value",
        },
        {
          id: "report-2",
          reportType: "monthly-expenses",
          filters: {},
        },
      ],
    });

    expect(migrated.reports).toEqual([
      {
        id: "report-1",
        name: "Monthly donations",
        reportType: "monthly-donations",
        filters: {
          currency: "USD",
          projectId: "project-water",
        },
        updatedAt: "2026-07-15T00:00:00.000Z",
      },
    ]);
    expect(() => localWorkspaceSchema.parse(migrated)).not.toThrow();
  });

  it("keeps general fund donations unlinked from projects during migration", () => {
    const migrated = migrateLocalWorkspace({
      sampleDataEnabled: false,
      projects: [
        {
          id: "project-general-fund",
          name: "General Fund",
          projectType: "General Operations",
        },
      ],
      donations: [
        {
          id: "donation-general-fund",
          donorId: "donor-1",
          donorName: "Unrestricted Donor",
          projectId: "project-general-fund",
          project: "General Fund",
          accountId: "main-donations-bank",
          method: "Bank Transfer",
          date: "2026-07-15",
          status: "Received",
          receiptReference: "DON-GF-1",
          notes: "",
          originalAmount: 100,
          originalCurrency: "USD",
          exchangeRate: 278,
        },
      ],
    });

    expect(migrated.projects.map((project) => project.name)).not.toContain("General Fund");
    expect(migrated.donations[0]).toMatchObject({
      projectId: "",
      project: "General Fund",
    });
  });
});
