import { describe, expect, it } from "vitest";
import { migrateLocalWorkspace } from "@/lib/local-data/migrations";
import { localWorkspaceSchemaVersion } from "@/lib/local-data/schema";
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
  });
});
