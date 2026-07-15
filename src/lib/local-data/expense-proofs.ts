import { z } from "zod";
import {
  type ExpenseProofKind,
  type LocalExpense,
  type LocalExpenseAttachmentMeta,
} from "@/lib/finance/local-finance";
import {
  appendAuditLogEntry,
  createWorkspaceBackup,
  loadLocalWorkspace,
  saveLocalWorkspace,
} from "@/lib/local-data/repository";
import type { LocalWorkspace } from "@/lib/local-data/schema";

const expenseProofDbName = "sukoonos.expense.proofs";
const expenseProofStoreName = "attachments";
const expenseProofDbVersion = 1;

export const expenseProofAccept =
  "image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif,application/pdf";
export const maxExpenseProofFileBytes = 10 * 1024 * 1024;
export const maxExpenseProofBackupBytes = 50 * 1024 * 1024;
const compressExpenseProofThresholdBytes = 4 * 1024 * 1024;
const targetCompressedImageBytes = 3 * 1024 * 1024;

export type StoredExpenseAttachmentRecord = LocalExpenseAttachmentMeta & {
  expenseId: string;
  lastModified: number;
  blob: Blob;
};

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type ExpenseProofBackupEntry = LocalExpenseAttachmentMeta & {
  expenseId: string;
  lastModified: number;
  base64: string;
};

type ExpenseProofBackup = {
  version: 1;
  exportedAt: string;
  notice: string;
  attachments: ExpenseProofBackupEntry[];
  missingAttachmentIds: string[];
};

const expenseProofBackupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string().min(1),
    notice: z.string().min(1),
    missingAttachmentIds: z.array(z.string().min(1)),
    attachments: z.array(
      z.object({
        id: z.string().min(1),
        expenseId: z.string().min(1),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        sizeBytes: z.number().nonnegative(),
        kind: z.enum(["Image", "PDF"]),
        storedAt: z.string().min(1),
        lastModified: z.number().nonnegative(),
        base64: z.string().min(1),
      }),
    ),
  })
  .strict();

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function fileExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name.toLowerCase());
  return match?.[1] ?? "";
}

function acceptedProofKind(file: Pick<File, "name" | "type">): ExpenseProofKind | null {
  const extension = fileExtension(file.name);
  if (file.type === "application/pdf" || extension === "pdf") {
    return "PDF";
  }

  const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
  const imageExtensions = new Set(["jpg", "jpeg", "png", "heic", "heif"]);

  if (imageMimeTypes.has(file.type) || imageExtensions.has(extension)) {
    return "Image";
  }

  return null;
}

function renameToJpeg(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error("The proof file could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, content] = dataUrl.split(",", 2);
  const mimeTypeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeTypeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(content ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function openExpenseProofDatabase() {
  if (!isBrowser()) {
    throw new Error("Expense proofs are only available in the browser.");
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(expenseProofDbName, expenseProofDbVersion);

    request.onerror = () => reject(request.error ?? new Error("Expense proof storage could not be opened."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(expenseProofStoreName)) {
        const store = database.createObjectStore(expenseProofStoreName, { keyPath: "id" });
        store.createIndex("expenseId", "expenseId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withExpenseProofStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return openExpenseProofDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(expenseProofStoreName, mode);
        const store = transaction.objectStore(expenseProofStoreName);

        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("Expense proof storage request failed."));
        run(store, resolve, reject);
      }),
  );
}

async function compressImageFile(file: File) {
  if (!isBrowser() || file.size <= compressExpenseProofThresholdBytes || typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      return file;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const qualitySteps = [0.9, 0.84, 0.78, 0.72, 0.66];
    let bestBlob: Blob | null = null;

    for (const quality of qualitySteps) {
      const candidate = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

      if (!candidate) {
        continue;
      }

      if (!bestBlob || candidate.size < bestBlob.size) {
        bestBlob = candidate;
      }

      if (candidate.size <= targetCompressedImageBytes) {
        break;
      }
    }

    if (!bestBlob || bestBlob.size >= file.size) {
      return file;
    }

    return new File([bestBlob], renameToJpeg(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

export function expenseHasProof(expense: Pick<LocalExpense, "attachments">) {
  return expense.attachments.length > 0;
}

export function expenseProofStatusLabel(expense: Pick<LocalExpense, "attachments">) {
  return expenseHasProof(expense) ? "Proof attached" : "Missing proof";
}

export function expenseProofFileNames(expense: Pick<LocalExpense, "attachments">) {
  return expense.attachments.map((attachment) => attachment.fileName);
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} B`;
}

export async function prepareExpenseProofFile(file: File) {
  const kind = acceptedProofKind(file);
  if (!kind) {
    throw new Error("Expense proofs must be JPG, JPEG, PNG, HEIC, or PDF files.");
  }

  if (file.size <= 0 || !Number.isFinite(file.size)) {
    throw new Error("Selected proof file is empty or invalid.");
  }

  if (file.size > maxExpenseProofFileBytes && kind === "PDF") {
    throw new Error(`PDF proofs must be ${Math.round(maxExpenseProofFileBytes / 1024 / 1024)} MB or smaller.`);
  }

  const processedFile = kind === "Image" ? await compressImageFile(file) : file;

  if (processedFile.size > maxExpenseProofFileBytes) {
    throw new Error(
      `${processedFile.name} is still larger than ${Math.round(maxExpenseProofFileBytes / 1024 / 1024)} MB after processing.`,
    );
  }

  const metadata: LocalExpenseAttachmentMeta = {
    id: createId("proof"),
    fileName: processedFile.name,
    mimeType: processedFile.type || (kind === "PDF" ? "application/pdf" : "image/jpeg"),
    sizeBytes: processedFile.size,
    kind,
    storedAt: new Date().toISOString(),
  };

  return {
    blob: processedFile,
    lastModified: processedFile.lastModified ?? Date.now(),
    metadata,
  };
}

export function makeExpenseProofRecord(
  expenseId: string,
  metadata: LocalExpenseAttachmentMeta,
  blob: Blob,
  lastModified = Date.now(),
): StoredExpenseAttachmentRecord {
  return {
    ...metadata,
    expenseId,
    blob,
    lastModified,
  };
}

export async function storeExpenseProofAttachment(record: StoredExpenseAttachmentRecord) {
  return withExpenseProofStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Expense proof could not be saved."));
  });
}

export async function getExpenseProofAttachmentRecord(id: string) {
  return withExpenseProofStore<StoredExpenseAttachmentRecord | null>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as StoredExpenseAttachmentRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Expense proof could not be loaded."));
  });
}

export async function getExpenseProofAttachmentBlob(id: string) {
  const record = await getExpenseProofAttachmentRecord(id);
  return record?.blob ?? null;
}

export async function deleteExpenseProofAttachment(id: string) {
  return withExpenseProofStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Expense proof could not be removed."));
  });
}

export async function exportExpenseProofBackup() {
  const workspace = loadLocalWorkspace();
  const attachments = workspace.expenses.flatMap((expense) =>
    expense.attachments.map((attachment) => ({
      expenseId: expense.id,
      metadata: attachment,
    })),
  );
  const backupEntries: ExpenseProofBackupEntry[] = [];
  const missingAttachmentIds: string[] = [];

  for (const attachment of attachments) {
    const record = await getExpenseProofAttachmentRecord(attachment.metadata.id);
    if (!record?.blob) {
      missingAttachmentIds.push(attachment.metadata.id);
      continue;
    }

    const dataUrl = await blobToDataUrl(record.blob);
    backupEntries.push({
      ...attachment.metadata,
      expenseId: attachment.expenseId,
      lastModified: record.lastModified,
      base64: dataUrl,
    });
  }

  const backup: ExpenseProofBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notice:
      "This proof backup contains binary files for expense proofs. Restore the matching workspace JSON metadata before or after importing this file.",
    attachments: backupEntries,
    missingAttachmentIds,
  };

  const auditedWorkspace = appendAuditLogEntry(workspace, {
    entityType: "workspace",
    entityId: "expense-proofs",
    action: "exported-expense-proofs",
    actor: "Local Demo User",
    metadata: {
      attachments: backupEntries.length,
      missingAttachmentIds: missingAttachmentIds.length,
    },
  });
  saveLocalWorkspace(auditedWorkspace);

  return JSON.stringify(backup, null, 2);
}

export async function importExpenseProofBackup(
  input: string,
  storage?: BrowserStorage | null,
): Promise<{ imported: number; linked: number; skipped: number; missingExpenses: number }> {
  if (new Blob([input]).size > maxExpenseProofBackupBytes) {
    throw new Error(`Expense proof backups must be smaller than ${Math.round(maxExpenseProofBackupBytes / 1024 / 1024)} MB.`);
  }

  const resolvedStorage = storage === undefined ? undefined : storage;
  createWorkspaceBackup("import-expense-proofs", resolvedStorage);
  const parsed = expenseProofBackupSchema.parse(JSON.parse(input)) as ExpenseProofBackup;
  const workspace = loadLocalWorkspace(resolvedStorage);
  const expenseById = new Map(workspace.expenses.map((expense) => [expense.id, expense]));
  let imported = 0;
  let linked = 0;
  let skipped = 0;
  let missingExpenses = 0;

  for (const attachment of parsed.attachments) {
    const expense = expenseById.get(attachment.expenseId);
    if (!expense) {
      missingExpenses += 1;
      continue;
    }

    const blob = dataUrlToBlob(attachment.base64);
    const record = makeExpenseProofRecord(
      attachment.expenseId,
      {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        kind: attachment.kind,
        storedAt: attachment.storedAt,
      },
      blob,
      attachment.lastModified,
    );

    const existingRecord = await getExpenseProofAttachmentRecord(attachment.id);
    if (!existingRecord) {
      await storeExpenseProofAttachment(record);
      imported += 1;
    } else {
      skipped += 1;
    }

    if (!expense.attachments.some((item) => item.id === attachment.id)) {
      expense.attachments = [
        ...expense.attachments,
        {
          id: record.id,
          fileName: record.fileName,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          kind: record.kind,
          storedAt: record.storedAt,
        },
      ];
      linked += 1;
    }
  }

  const nextWorkspace: LocalWorkspace = {
    ...workspace,
    expenses: workspace.expenses.map((expense) => expenseById.get(expense.id) ?? expense),
  };
  const auditedWorkspace = appendAuditLogEntry(nextWorkspace, {
    entityType: "workspace",
    entityId: "expense-proofs",
    action: "imported-expense-proofs",
    actor: "Local Demo User",
    metadata: { imported, linked, skipped, missingExpenses },
  });
  saveLocalWorkspace(auditedWorkspace, resolvedStorage);

  return { imported, linked, skipped, missingExpenses };
}
