import { afterEach, describe, expect, it } from "vitest";
import type { LocalExpenseAttachmentMeta } from "@/lib/finance/local-finance";
import { normalizeLocalExpense } from "@/lib/finance/local-finance";
import {
  deleteExpenseProofAttachment,
  expenseHasProof,
  exportExpenseProofBackup,
  getExpenseProofAttachmentBlob,
  getExpenseProofAttachmentRecord,
  importExpenseProofBackup,
  makeExpenseProofRecord,
  storeExpenseProofAttachment,
} from "@/lib/local-data/expense-proofs";
import { createEmptyWorkspace } from "@/lib/local-data/migrations";
import { exportLocalWorkspace, importLocalWorkspace, loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import { generateReport } from "@/lib/local-data/reporting";
import { localWorkspaceStorageKey } from "@/lib/local-data/schema";
import { localWorkspaceSchema } from "@/lib/local-data/validation";
import { installIndexedDbTestEnv } from "../helpers/indexeddb";
import { createMemoryStorage } from "../helpers/storage";

const attachmentMeta: LocalExpenseAttachmentMeta = {
  id: "proof-1",
  fileName: "receipt-1001.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 128,
  kind: "Image",
  storedAt: "2026-07-15T00:00:00.000Z",
};

function baseExpense(overrides: Partial<ReturnType<typeof normalizeLocalExpense>> = {}) {
  return normalizeLocalExpense({
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
    transferReference: "",
    approvalStatus: "Approved",
    proofNotes: "",
    notes: "",
    attachments: [],
    ...overrides,
  });
}

function toCsv(report: ReturnType<typeof generateReport>) {
  return [report.columns.map((column) => column.label), ...report.rows.map((row) => report.columns.map((column) => String(row[column.key] ?? "")))]
    .map((row) => row.join(","))
    .join("\n");
}

let restoreEnv: (() => void) | null = null;

afterEach(() => {
  restoreEnv?.();
  restoreEnv = null;
});

describe("expense proof workflows", () => {
  it("migrates legacy expenses without proof fields and keeps explicit proof fields for new expenses", () => {
    const legacyStorage = createMemoryStorage({
      [localWorkspaceStorageKey]: JSON.stringify({
        ...createEmptyWorkspace(),
        updatedAt: "2026-07-15T00:00:00.000Z",
        expenses: [
          {
            id: "legacy-expense",
            date: "2026-07-15",
            originalAmount: 2200,
            originalCurrency: "PKR",
            exchangeRate: 278,
            category: "Food",
            projectId: "",
            project: "General Operations",
            fundingAccountId: "operations-bank-pkr",
            description: "Legacy groceries",
            paymentMethod: "Cash",
            paidBy: "Bilal",
            receiptReference: "EXP-OLD",
            approvalStatus: "Approved",
            notes: "",
          },
          {
            id: "proof-expense",
            date: "2026-07-16",
            originalAmount: 3300,
            originalCurrency: "PKR",
            exchangeRate: 278,
            category: "Food",
            projectId: "",
            project: "General Operations",
            fundingAccountId: "operations-bank-pkr",
            description: "Documented groceries",
            paymentMethod: "Cash",
            paidBy: "Ayesha",
            receiptReference: "EXP-NEW",
            transferReference: "TRF-19",
            approvalStatus: "Approved",
            proofNotes: "Photo attached.",
            notes: "",
            attachments: [attachmentMeta],
          },
        ],
      }),
    });

    const migrated = loadLocalWorkspace(legacyStorage);

    expect(migrated.expenses[0]).toMatchObject({
      id: "legacy-expense",
      transferReference: "",
      proofNotes: "",
      attachments: [],
    });
    expect(migrated.expenses[1]).toMatchObject({
      id: "proof-expense",
      transferReference: "TRF-19",
      proofNotes: "Photo attached.",
      attachments: [attachmentMeta],
    });
  });

  it("persists attachment metadata across save, reload, edit, export/import, and removal while keeping blobs out of localStorage", async () => {
    const storage = createMemoryStorage();
    restoreEnv = installIndexedDbTestEnv(storage).restore;

    const attachmentBlob = new Blob(["receipt-binary-content"], { type: "image/jpeg" });
    const expense = baseExpense({
      attachments: [attachmentMeta],
      proofNotes: "Receipt photo attached.",
      transferReference: "TRF-44",
    });

    await storeExpenseProofAttachment(makeExpenseProofRecord(expense.id, attachmentMeta, attachmentBlob, 1721000));

    saveLocalWorkspace(
      {
        ...createEmptyWorkspace(),
        expenses: [expense],
      },
      storage,
    );

    const storedWorkspaceJson = storage.snapshot()[localWorkspaceStorageKey];
    expect(storedWorkspaceJson).toContain("receipt-1001.jpg");
    expect(storedWorkspaceJson).not.toContain("receipt-binary-content");
    expect(storedWorkspaceJson).not.toContain("base64");

    const loaded = loadLocalWorkspace(storage);
    expect(loaded.expenses[0]?.attachments).toEqual([attachmentMeta]);
    expect(expenseHasProof(loaded.expenses[0]!)).toBe(true);

    const proofRecord = await getExpenseProofAttachmentRecord(attachmentMeta.id);
    expect(proofRecord?.expenseId).toBe(expense.id);
    expect(await proofRecord?.blob.text()).toBe("receipt-binary-content");

    saveLocalWorkspace(
      {
        ...loaded,
        expenses: loaded.expenses.map((item) =>
          item.id === expense.id
            ? {
                ...item,
                notes: "Updated without losing proofs",
                attachments: item.attachments,
              }
            : item,
        ),
      },
      storage,
    );

    const edited = loadLocalWorkspace(storage);
    expect(edited.expenses[0]?.notes).toBe("Updated without losing proofs");
    expect(edited.expenses[0]?.attachments).toEqual([attachmentMeta]);
    expect(await (await getExpenseProofAttachmentBlob(attachmentMeta.id))?.text()).toBe("receipt-binary-content");

    const workspaceExport = exportLocalWorkspace(storage);
    expect(workspaceExport).toContain("receipt-1001.jpg");
    expect(workspaceExport).not.toContain("receipt-binary-content");

    importLocalWorkspace(workspaceExport, storage);
    const roundTripped = loadLocalWorkspace(storage);
    expect(roundTripped.expenses[0]?.attachments).toEqual([attachmentMeta]);
    expect(await (await getExpenseProofAttachmentBlob(attachmentMeta.id))?.text()).toBe("receipt-binary-content");

    saveLocalWorkspace(
      {
        ...roundTripped,
        expenses: roundTripped.expenses.map((item) =>
          item.id === expense.id
            ? {
                ...item,
                attachments: [],
                proofNotes: "",
              }
            : item,
        ),
      },
      storage,
    );
    await deleteExpenseProofAttachment(attachmentMeta.id);

    const removed = loadLocalWorkspace(storage);
    expect(removed.expenses[0]?.attachments).toEqual([]);
    expect(await getExpenseProofAttachmentBlob(attachmentMeta.id)).toBeNull();
  });

  it("supports missing-proof reporting, CSV output, and dedicated proof backups", async () => {
    const storage = createMemoryStorage();
    restoreEnv = installIndexedDbTestEnv(storage).restore;

    const missingExpense = baseExpense({
      id: "expense-missing",
      description: "Missing proof expense",
      attachments: [],
    });
    const attachedExpense = baseExpense({
      id: "expense-attached",
      description: "Attached proof expense",
      attachments: [attachmentMeta],
    });
    const attachmentBlob = new Blob(["receipt-binary-content"], { type: "image/jpeg" });
    await storeExpenseProofAttachment(makeExpenseProofRecord(attachedExpense.id, attachmentMeta, attachmentBlob, 1721000));

    saveLocalWorkspace(
      {
        ...createEmptyWorkspace(),
        expenses: [missingExpense, attachedExpense],
      },
      storage,
    );

    const missingProofReport = generateReport(loadLocalWorkspace(storage), "missing-expense-proof", {
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

    expect(missingProofReport.rows).toHaveLength(1);
    expect(missingProofReport.rows[0]).toMatchObject({
      description: "Missing proof expense",
      proofStatus: "Missing proof",
      attachmentFiles: "None",
    });
    const csv = toCsv(missingProofReport);
    expect(csv).toContain("Proof status");
    expect(csv).toContain("Attachment files");
    expect(csv).toContain("Missing proof");
    expect(csv).toContain("None");

    const proofBackup = await exportExpenseProofBackup();
    const parsedProofBackup = JSON.parse(proofBackup) as {
      attachments: Array<{ fileName: string; base64: string }>;
    };
    expect(parsedProofBackup.attachments).toHaveLength(1);
    expect(parsedProofBackup.attachments[0]?.fileName).toBe("receipt-1001.jpg");
    expect(parsedProofBackup.attachments[0]?.base64.startsWith("data:image/jpeg;base64,")).toBe(true);

    await deleteExpenseProofAttachment(attachmentMeta.id);
    expect(await getExpenseProofAttachmentBlob(attachmentMeta.id)).toBeNull();

    const beforeImport = loadLocalWorkspace(storage);
    saveLocalWorkspace(
      {
        ...beforeImport,
        expenses: beforeImport.expenses.map((item) =>
          item.id === attachedExpense.id
            ? {
                ...item,
                attachments: [],
              }
            : item,
        ),
      },
      storage,
    );

    const restoreResult = await importExpenseProofBackup(proofBackup, storage);
    const restored = loadLocalWorkspace(storage);

    expect(restoreResult.imported).toBe(1);
    expect(restoreResult.linked).toBe(1);
    expect(restored.expenses.find((item) => item.id === attachedExpense.id)?.attachments).toEqual([attachmentMeta]);
    expect(await (await getExpenseProofAttachmentBlob(attachmentMeta.id))?.text()).toBe("receipt-binary-content");
  });

  it("rejects unknown expense keys while accepting validated proof fields", () => {
    const workspace = createEmptyWorkspace();

    expect(() =>
      localWorkspaceSchema.parse({
        ...workspace,
        expenses: [
          {
            ...baseExpense({
              attachments: [attachmentMeta],
              proofNotes: "Receipt attached.",
              transferReference: "TRF-22",
            }),
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      localWorkspaceSchema.parse({
        ...workspace,
        expenses: [
          {
            ...baseExpense(),
            suspiciousKey: "should-not-persist",
          },
        ],
      }),
    ).toThrow(/Unrecognized key/);
  });
});
