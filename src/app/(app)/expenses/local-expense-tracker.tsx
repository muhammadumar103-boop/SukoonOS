"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Eye, FileImage, FileText, Paperclip, Pencil, Search, Trash2, Upload } from "lucide-react";
import { FormNotice } from "@/components/data-display/form-notice";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  approvalStatuses,
  convertedExpenseAmounts,
  convertedExpenseLabel,
  defaultFundingAccountId,
  defaultUsdToPkrRate,
  expenseCategories,
  formatMoney,
  localExpenseStorageKey,
  normalizeExpenseCategory,
  normalizeLocalExpense,
  normalizeSukoonProject,
  originalExpenseLabel,
  paymentMethods,
  type ApprovalStatus,
  type Currency,
  type FinanceAccount,
  type LocalExpenseAttachmentMeta,
  type LocalExpense,
} from "@/lib/finance/local-finance";
import {
  deleteExpenseProofAttachment,
  expenseHasProof,
  expenseProofAccept,
  expenseProofFileNames,
  expenseProofStatusLabel,
  exportExpenseProofBackup,
  formatFileSize,
  getExpenseProofAttachmentBlob,
  importExpenseProofBackup,
  makeExpenseProofRecord,
  prepareExpenseProofFile,
  storeExpenseProofAttachment,
} from "@/lib/local-data/expense-proofs";
import { expenseImpactsBalances, validateExchangeRateInput, validatePositiveMoneyInput } from "@/lib/local-data/finance-rules";
import { activeProjectOptions, projectLabel } from "@/lib/local-data/projects";
import { appendAuditLogEntry, loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalProject } from "@/lib/local-data/schema";
import { triggerDownload } from "@/lib/ui/downloads";
import { cn } from "@/lib/utils";

type InitialExpense = {
  id: string;
  vendor: string;
  category: string;
  amount: string;
  project: string;
  status: string;
};

type LocalExpenseTrackerProps = {
  initialExpenses: InitialExpense[];
};

type PendingProof = Awaited<ReturnType<typeof prepareExpenseProofFile>> & {
  previewUrl: string;
};

const demoExpenses: LocalExpense[] = [
  {
    id: "local-expense-1",
    date: "2026-07-11",
    originalAmount: 415000,
    originalCurrency: "PKR",
    exchangeRate: 278,
    category: "Medical Supplies",
    projectId: "project-hospital",
    project: "Hospital Project",
    fundingAccountId: "operations-bank-pkr",
    description: "Emergency medicine procurement",
    paymentMethod: "Bank Transfer",
    paidBy: "Ayesha Khan",
    receiptReference: "MA-2041",
    transferReference: "TXN-2041",
    approvalStatus: "Pending",
    proofNotes: "Vendor receipt is attached.",
    notes: "Awaiting program lead confirmation.",
    attachments: [],
  },
  {
    id: "local-expense-2",
    date: "2026-07-09",
    originalAmount: 9450,
    originalCurrency: "USD",
    exchangeRate: 279.5,
    category: "Office Supplies",
    projectId: "project-orphan-sponsorship",
    project: "Orphan Sponsorship",
    fundingAccountId: "main-donations-bank",
    description: "School books and stationery",
    paymentMethod: "Card",
    paidBy: "Mariam Khan",
    receiptReference: "EDU-1187",
    transferReference: "",
    approvalStatus: "Approved",
    proofNotes: "",
    notes: "Matched to July education budget.",
    attachments: [],
  },
  {
    id: "local-expense-3",
    date: "2026-07-06",
    originalAmount: 680000,
    originalCurrency: "PKR",
    exchangeRate: 277,
    category: "Food",
    projectId: "project-food-parcels",
    project: "Food Parcels",
    fundingAccountId: "operations-bank-pkr",
    description: "Food parcel packaging and staples",
    paymentMethod: "Cheque",
    paidBy: "Bilal Ahmed",
    receiptReference: "FP-7720",
    transferReference: "CHK-7720",
    approvalStatus: "Paid",
    proofNotes: "Paper invoice matched to cheque issue.",
    notes: "Vendor payment completed.",
    attachments: [],
  },
];

const emptyForm: Omit<LocalExpense, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  originalAmount: 0,
  originalCurrency: "PKR",
  exchangeRate: defaultUsdToPkrRate,
  category: expenseCategories[0],
  projectId: "",
  project: "General Operations",
  fundingAccountId: defaultFundingAccountId(paymentMethods[0], "PKR"),
  description: "",
  paymentMethod: paymentMethods[0],
  paidBy: "",
  receiptReference: "",
  transferReference: "",
  approvalStatus: "Pending",
  proofNotes: "",
  notes: "",
  attachments: [],
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseCurrencyAmount(amount: string) {
  const numeric = Number(amount.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeInitialExpense(expense: InitialExpense, index: number): LocalExpense {
  return {
    id: expense.id,
    date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
    originalAmount: parseCurrencyAmount(expense.amount),
    originalCurrency: expense.amount.includes("$") ? "USD" : "PKR",
    exchangeRate: defaultUsdToPkrRate,
    category: normalizeExpenseCategory(expense.category),
    projectId: "",
    project: normalizeSukoonProject(expense.project),
    fundingAccountId: defaultFundingAccountId("Bank Transfer", expense.amount.includes("$") ? "USD" : "PKR"),
    description: expense.vendor,
    paymentMethod: "Bank Transfer",
    paidBy: "Operations Team",
    receiptReference: `EXP-${String(index + 1).padStart(4, "0")}`,
    transferReference: "",
    approvalStatus: approvalStatuses.includes(expense.status as ApprovalStatus) ? (expense.status as ApprovalStatus) : "Pending",
    proofNotes: "",
    notes: "Imported from SukoonOS demo data.",
    attachments: [],
  };
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function LocalExpenseTracker({ initialExpenses }: LocalExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<"All" | Currency>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | ApprovalStatus>("All");
  const [proofFilter, setProofFilter] = useState<"All" | "Attached" | "Missing">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const workspaceRef = useRef<ReturnType<typeof loadLocalWorkspace> | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pendingProofs, setPendingProofs] = useState<PendingProof[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [storedProofPreviewUrls, setStoredProofPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const proofBackupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const localWorkspace = loadLocalWorkspace();
    workspaceRef.current = localWorkspace;
    setAccounts(localWorkspace.financeAccounts);
    setProjects(localWorkspace.projects);
    const defaultProject = activeProjectOptions(localWorkspace.projects)[0];
    const defaultAccount = localWorkspace.financeAccounts.find((account) => account.currency === emptyForm.originalCurrency);
    setForm((current) => ({
      ...current,
      projectId: defaultProject?.id ?? current.projectId,
      project: defaultProject?.name ?? current.project,
      fundingAccountId: defaultAccount?.id ?? "",
    }));

    if (localWorkspace.expenses.length) {
      setExpenses(localWorkspace.expenses.map(normalizeLocalExpense));
      return;
    }

    const saved = window.localStorage.getItem(localExpenseStorageKey);

    if (saved) {
      try {
        const normalized = (JSON.parse(saved) as LocalExpense[]).map(normalizeLocalExpense);
        setExpenses(normalized);
        workspaceRef.current = saveLocalWorkspace({ ...localWorkspace, expenses: normalized });
        return;
      } catch {
        window.localStorage.removeItem(localExpenseStorageKey);
      }
    }

    if (!localWorkspace.sampleDataEnabled) {
      setExpenses([]);
      return;
    }

    const seededExpenses = initialExpenses.length ? initialExpenses.map(normalizeInitialExpense) : demoExpenses.map(normalizeLocalExpense);
    setExpenses(seededExpenses);
    workspaceRef.current = saveLocalWorkspace({ ...localWorkspace, expenses: seededExpenses, sampleDataEnabled: true });
  }, [initialExpenses]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const displayProject = projectLabel(projects, expense);
      const searchable = [
        expense.date,
        expense.originalCurrency,
        expense.exchangeRate,
        expense.category,
        displayProject,
        expense.description,
        expense.paymentMethod,
        expense.paidBy,
        expense.receiptReference,
        expense.transferReference,
        expense.approvalStatus,
        expense.proofNotes,
        expense.notes,
        expense.attachments.map((attachment) => attachment.fileName).join(" "),
        expenseHasProof(expense) ? "Proof attached" : "Missing proof",
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (currencyFilter === "All" || expense.originalCurrency === currencyFilter) &&
        (statusFilter === "All" || expense.approvalStatus === statusFilter) &&
        (proofFilter === "All" ||
          (proofFilter === "Attached" ? expenseHasProof(expense) : !expenseHasProof(expense))) &&
        (categoryFilter === "All" || expense.category === categoryFilter) &&
        (projectFilter === "All" || displayProject === projectFilter)
      );
    });
  }, [categoryFilter, currencyFilter, expenses, projectFilter, projects, proofFilter, search, statusFilter]);

  const totals = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return expenses.reduce(
      (result, expense) => {
        if (!expenseImpactsBalances(expense)) {
          return result;
        }

        const amounts = convertedExpenseAmounts(expense);
        result.PKR += amounts.pkr;
        result.USD += amounts.usd;

        if (expense.date.startsWith(currentMonth)) {
          result.month.PKR += amounts.pkr;
          result.month.USD += amounts.usd;
        }

        return result;
      },
      { PKR: 0, USD: 0, month: { PKR: 0, USD: 0 } },
    );
  }, [expenses]);

  function revokeProofUrls(urls: string[]) {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }

  function clearStoredProofPreviews() {
    setStoredProofPreviewUrls((current) => {
      revokeProofUrls(Object.values(current));
      return {};
    });
  }

  function clearPendingProofState() {
    setPendingProofs((current) => {
      revokeProofUrls(current.map((proof) => proof.previewUrl));
      return [];
    });
    setRemovedAttachmentIds([]);
    clearStoredProofPreviews();
  }

  async function loadStoredProofPreviews(attachments: LocalExpenseAttachmentMeta[]) {
    clearStoredProofPreviews();
    const nextPreviews: Record<string, string> = {};

    for (const attachment of attachments) {
      if (attachment.kind !== "Image") {
        continue;
      }

      const blob = await getExpenseProofAttachmentBlob(attachment.id);
      if (blob) {
        nextPreviews[attachment.id] = URL.createObjectURL(blob);
      }
    }

    setStoredProofPreviewUrls(nextPreviews);
  }

  function persistExpenses(
    nextExpenses: LocalExpense[],
    auditEntries: Array<{
      action: string;
      entityId: string;
      entityType: string;
      metadata: Record<string, unknown>;
    }> = [],
  ) {
    if (!workspaceRef.current) {
      return;
    }

    window.localStorage.setItem(localExpenseStorageKey, JSON.stringify(nextExpenses));
    let nextWorkspace = { ...workspaceRef.current, expenses: nextExpenses };
    for (const entry of auditEntries) {
      nextWorkspace = appendAuditLogEntry(nextWorkspace, {
        actor: "Local Demo User",
        ...entry,
      });
    }
    const savedWorkspace = saveLocalWorkspace(nextWorkspace);

    workspaceRef.current = savedWorkspace;
    setExpenses(savedWorkspace.expenses);
  }

  function updateForm<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOriginalCurrency(currency: Currency) {
    setForm((current) => ({
      ...current,
      originalCurrency: currency,
      fundingAccountId: accounts.find((account) => account.currency === currency)?.id ?? "",
    }));
  }

  function updatePaymentMethod(paymentMethod: string) {
    setForm((current) => ({
      ...current,
      paymentMethod,
      fundingAccountId: accounts.find((account) => account.currency === current.originalCurrency)?.id ?? "",
    }));
  }

  function resetForm() {
    const firstProject = activeProjectOptions(projects)[0];
    const firstAccount = accounts.find((account) => account.currency === emptyForm.originalCurrency);
    clearPendingProofState();
    setForm({
      ...emptyForm,
      projectId: firstProject?.id ?? "",
      project: firstProject?.name ?? "General Operations",
      fundingAccountId: firstAccount?.id ?? "",
    });
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedProject = projects.find((project) => project.id === form.projectId);
    const selectedAccount = accounts.find((account) => account.id === form.fundingAccountId && account.currency === form.originalCurrency);
    if (!selectedProject) {
      setNotice({ tone: "error", message: "Select a project before saving an expense." });
      return;
    }

    if (!selectedAccount) {
      setNotice({ tone: "error", message: "Select a matching funding account before saving an expense." });
      return;
    }

    const amountError = validatePositiveMoneyInput(Number(form.originalAmount));
    if (amountError) {
      setNotice({ tone: "error", message: amountError });
      return;
    }

    const exchangeRateError = validateExchangeRateInput(Number(form.exchangeRate));
    if (exchangeRateError) {
      setNotice({ tone: "error", message: exchangeRateError });
      return;
    }

    const previousExpense = editingId ? expenses.find((expense) => expense.id === editingId) : null;
    const nextExpense: LocalExpense = {
      id: editingId ?? createId(),
      ...form,
      project: selectedProject.name,
      fundingAccountId: selectedAccount.id,
      originalAmount: Number(form.originalAmount),
      exchangeRate: Number(form.exchangeRate),
    };

    try {
      for (const proof of pendingProofs) {
        await storeExpenseProofAttachment(
          makeExpenseProofRecord(nextExpense.id, proof.metadata, proof.blob, proof.lastModified),
        );
      }

      for (const attachmentId of removedAttachmentIds) {
        await deleteExpenseProofAttachment(attachmentId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Expense proof files could not be saved.";
      setNotice({ tone: "error", message });
      return;
    }

    const nextExpenses = editingId
      ? expenses.map((expense) => (expense.id === editingId ? nextExpense : expense))
      : [nextExpense, ...expenses];
    const auditEntries: Array<{
      action: string;
      entityId: string;
      entityType: string;
      metadata: Record<string, unknown>;
    }> = [
      {
        action: editingId ? "updated" : "created",
        entityId: nextExpense.id,
        entityType: "expense",
        metadata: {
          accountId: nextExpense.fundingAccountId,
          projectId: nextExpense.projectId,
          status: nextExpense.approvalStatus,
          proofCount: nextExpense.attachments.length,
        },
      },
    ];

    for (const proof of pendingProofs) {
      auditEntries.push({
        action: "attached-proof",
        entityId: proof.metadata.id,
        entityType: "expense-proof",
        metadata: {
          expenseId: nextExpense.id,
          fileName: proof.metadata.fileName,
          mimeType: proof.metadata.mimeType,
          sizeBytes: proof.metadata.sizeBytes,
        },
      });
    }

    for (const attachmentId of removedAttachmentIds) {
      const removedAttachment = previousExpense?.attachments.find((attachment) => attachment.id === attachmentId);
      auditEntries.push({
        action: "removed-proof",
        entityId: attachmentId,
        entityType: "expense-proof",
        metadata: {
          expenseId: nextExpense.id,
          fileName: removedAttachment?.fileName ?? "Unknown proof",
        },
      });
    }

    if (pendingProofs.length && removedAttachmentIds.length) {
      auditEntries.push({
        action: "replaced-proof",
        entityId: nextExpense.id,
        entityType: "expense",
        metadata: {
          addedProofs: pendingProofs.length,
          removedProofs: removedAttachmentIds.length,
        },
      });
    }

    persistExpenses(nextExpenses, auditEntries);
    setNotice({
      tone: "success",
      message:
        editingId
          ? `Expense updated in the local workspace${pendingProofs.length || removedAttachmentIds.length ? " with proof changes." : "."}`
          : "Expense saved to the local workspace.",
    });

    resetForm();
  }

  function editExpense(expense: LocalExpense) {
    clearPendingProofState();
    setForm({
      date: expense.date,
      originalAmount: expense.originalAmount,
      originalCurrency: expense.originalCurrency,
      exchangeRate: expense.exchangeRate,
      category: expense.category,
      projectId: expense.projectId,
      project: expense.project,
      fundingAccountId: expense.fundingAccountId,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      paidBy: expense.paidBy,
      receiptReference: expense.receiptReference,
      transferReference: expense.transferReference,
      approvalStatus: expense.approvalStatus,
      proofNotes: expense.proofNotes,
      notes: expense.notes,
      attachments: expense.attachments,
    });
    setEditingId(expense.id);
    void loadStoredProofPreviews(expense.attachments);
  }

  function deleteExpense(id: string) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) {
      return;
    }

    const confirmed = window.confirm(
      expenseImpactsBalances(expense)
        ? "This expense already affects balances. Void it instead of deleting it?"
        : "Void this expense in the local workspace?",
    );
    if (!confirmed) {
      return;
    }

    persistExpenses(
      expenses.map((item) =>
        item.id === id
          ? {
              ...item,
              approvalStatus: "Voided",
            }
          : item,
      ),
      [
        {
          action: "voided",
          entityId: expense.id,
          entityType: "expense",
          metadata: { previousStatus: expense.approvalStatus, projectId: expense.projectId },
        },
      ],
    );
    setNotice({ tone: "success", message: "Expense was voided and kept in the local audit trail." });
    if (editingId === id) {
      resetForm();
    }
  }

  function exportCsv() {
    try {
      const headers = [
        "Date",
        "Original Amount",
        "Original Currency",
        "Exchange Rate (PKR per USD)",
        "Converted Amount",
        "Converted Currency",
        "PKR Value",
        "USD Value",
        "Category",
        "Project",
        "Description",
        "Payment Method",
        "Paid By",
        "Receipt Reference",
        "Bank Transfer / Reference Number",
        "Proof Status",
        "Proof Notes",
        "Attachment Filenames",
        "Approval Status",
        "Notes",
      ];
      const rows = filteredExpenses.map((expense) => {
        const amounts = convertedExpenseAmounts(expense);
        const displayProject = projectLabel(projects, expense);
        return [
          expense.date,
          expense.originalAmount,
          expense.originalCurrency,
          expense.exchangeRate,
          amounts.convertedAmount,
          amounts.convertedCurrency,
          amounts.pkr,
          amounts.usd,
          expense.category,
          displayProject,
          expense.description,
          expense.paymentMethod,
          expense.paidBy,
          expense.receiptReference,
          expense.transferReference,
          expenseProofStatusLabel(expense),
          expense.proofNotes,
          expenseProofFileNames(expense).join("; "),
          expense.approvalStatus,
          expense.notes,
        ];
      });
      const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      triggerDownload(blob, `sukoonos-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
      setNotice({ tone: "success", message: "Expenses CSV exported." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The expenses CSV could not be exported.";
      setNotice({ tone: "error", message });
    }
  }

  const availableProjects = activeProjectOptions(projects);
  const availableFundingAccounts = accounts.filter((account) => account.currency === form.originalCurrency);
  const projectNames = Array.from(new Set(expenses.map((expense) => projectLabel(projects, expense)))).sort();
  const totalAttachedProofs = expenses.filter((expense) => expenseHasProof(expense)).length;
  const visibleAttachments = form.attachments.map((attachment) => {
    const pendingProof = pendingProofs.find((proof) => proof.metadata.id === attachment.id);
    return {
      ...attachment,
      previewUrl: pendingProof?.previewUrl ?? storedProofPreviewUrls[attachment.id] ?? "",
      pending: Boolean(pendingProof),
    };
  });

  async function handleProofSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    try {
      const preparedProofs: PendingProof[] = [];
      let duplicateCount = 0;

      for (const file of files) {
        const prepared = await prepareExpenseProofFile(file);
        const duplicate = [...form.attachments, ...preparedProofs.map((proof) => proof.metadata)].some(
          (attachment) =>
            attachment.fileName.toLowerCase() === prepared.metadata.fileName.toLowerCase() &&
            attachment.sizeBytes === prepared.metadata.sizeBytes,
        );

        if (duplicate) {
          duplicateCount += 1;
          continue;
        }

        preparedProofs.push({
          ...prepared,
          previewUrl: prepared.metadata.kind === "Image" ? URL.createObjectURL(prepared.blob) : "",
        });
      }

      if (!preparedProofs.length) {
        setNotice({
          tone: "error",
          message: duplicateCount ? "Selected proof files are already attached to this expense." : "No valid proof files were selected.",
        });
        return;
      }

      setPendingProofs((current) => [...current, ...preparedProofs]);
      setForm((current) => ({
        ...current,
        attachments: [...current.attachments, ...preparedProofs.map((proof) => proof.metadata)],
      }));
      setNotice({
        tone: "success",
        message: `${preparedProofs.length} proof file${preparedProofs.length === 1 ? "" : "s"} added to this expense${duplicateCount ? ` (${duplicateCount} duplicate skipped).` : "."}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Proof files could not be added.";
      setNotice({ tone: "error", message });
    } finally {
      event.target.value = "";
    }
  }

  function removeAttachment(attachment: LocalExpenseAttachmentMeta) {
    const confirmed = window.confirm(`Remove ${attachment.fileName} from this expense proof list?`);
    if (!confirmed) {
      return;
    }

    const pendingProof = pendingProofs.find((proof) => proof.metadata.id === attachment.id);
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((item) => item.id !== attachment.id),
    }));
    setPendingProofs((current) => {
      const nextProofs = current.filter((item) => item.metadata.id !== attachment.id);
      const removed = current.find((item) => item.metadata.id === attachment.id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return nextProofs;
    });
    if (!pendingProof) {
      setRemovedAttachmentIds((current) => (current.includes(attachment.id) ? current : [...current, attachment.id]));
    }
    setStoredProofPreviewUrls((current) => {
      if (!current[attachment.id]) {
        return current;
      }

      URL.revokeObjectURL(current[attachment.id]);
      const next = { ...current };
      delete next[attachment.id];
      return next;
    });
    setNotice({ tone: "success", message: `${attachment.fileName} will be removed when you save this expense.` });
  }

  async function openAttachment(attachment: LocalExpenseAttachmentMeta, mode: "open" | "download") {
    const pendingProof = pendingProofs.find((proof) => proof.metadata.id === attachment.id);
    const blob = pendingProof?.blob ?? (await getExpenseProofAttachmentBlob(attachment.id));

    if (!blob) {
      setNotice({
        tone: "error",
        message: `${attachment.fileName} is not available in this browser. Restore the expense proof backup to recover the file.`,
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    if (mode === "open") {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.download = attachment.fileName;
    }
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({
      tone: "success",
      message: mode === "open" ? `${attachment.fileName} opened in a new tab.` : `${attachment.fileName} downloaded from this browser.`,
    });
  }

  async function handleExportProofBackup() {
    try {
      const backup = await exportExpenseProofBackup();
      const blob = new Blob([backup], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, `sukoonos-expense-proofs-${new Date().toISOString().replaceAll(":", "-")}.json`);
      setNotice({ tone: "success", message: "Expense proof backup exported." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Expense proof backup could not be exported.";
      setNotice({ tone: "error", message });
    }
  }

  async function handleImportProofBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Importing an expense proof backup can restore files and metadata for this browser. Continue?",
    );
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const result = await importExpenseProofBackup(text);
      setNotice({
        tone: "success",
        message: `Expense proof backup imported: ${result.imported} file${result.imported === 1 ? "" : "s"} restored, ${result.linked} metadata link${result.linked === 1 ? "" : "s"} updated.`,
      });
      const localWorkspace = loadLocalWorkspace();
      workspaceRef.current = localWorkspace;
      setExpenses(localWorkspace.expenses);
      setAccounts(localWorkspace.financeAccounts);
      setProjects(localWorkspace.projects);
      if (editingId) {
        const refreshedExpense = localWorkspace.expenses.find((expense) => expense.id === editingId);
        if (refreshedExpense) {
          setForm({
            date: refreshedExpense.date,
            originalAmount: refreshedExpense.originalAmount,
            originalCurrency: refreshedExpense.originalCurrency,
            exchangeRate: refreshedExpense.exchangeRate,
            category: refreshedExpense.category,
            projectId: refreshedExpense.projectId,
            project: refreshedExpense.project,
            fundingAccountId: refreshedExpense.fundingAccountId,
            description: refreshedExpense.description,
            paymentMethod: refreshedExpense.paymentMethod,
            paidBy: refreshedExpense.paidBy,
            receiptReference: refreshedExpense.receiptReference,
            transferReference: refreshedExpense.transferReference,
            approvalStatus: refreshedExpense.approvalStatus,
            proofNotes: refreshedExpense.proofNotes,
            notes: refreshedExpense.notes,
            attachments: refreshedExpense.attachments,
          });
          void loadStoredProofPreviews(refreshedExpense.attachments);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Expense proof backup could not be imported.";
      setNotice({ tone: "error", message });
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="PKR total (all expenses)" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="USD total (all expenses)" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="This month PKR value" value={formatMoney(totals.month.PKR, "PKR")} />
        <SummaryCard label="This month USD value" value={formatMoney(totals.month.USD, "USD")} />
        <SummaryCard label="Expenses with proof attached" value={String(totalAttachedProofs)} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit expense" : "Add expense"}</h2>
          <p className="text-sm text-slate-500">Saved locally in this browser for immediate demo use.</p>
        </div>
        {notice ? <div className="mt-4"><FormNotice message={notice.message} tone={notice.tone} /></div> : null}

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <Field label="Date">
            <input className={inputClass} onChange={(event) => updateForm("date", event.target.value)} required type="date" value={form.date} />
          </Field>
          <Field label="Original amount">
            <input
              className={inputClass}
              min="0"
              onChange={(event) => updateForm("originalAmount", Number(event.target.value))}
              required
              step="0.01"
              type="number"
              value={form.originalAmount}
            />
          </Field>
          <Field label="Original currency">
            <select className={inputClass} onChange={(event) => updateOriginalCurrency(event.target.value as Currency)} value={form.originalCurrency}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Exchange rate">
            <input
              className={inputClass}
              min="0.0001"
              onChange={(event) => updateForm("exchangeRate", Number(event.target.value))}
              required
              step="0.0001"
              type="number"
              value={form.exchangeRate}
            />
            <span className="mt-1 block text-xs text-slate-500">PKR per 1 USD. Edit per transaction for historical rates.</span>
          </Field>
          <Field label="Approval status">
            <select className={inputClass} onChange={(event) => updateForm("approvalStatus", event.target.value as ApprovalStatus)} value={form.approvalStatus}>
              {approvalStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} onChange={(event) => updateForm("category", event.target.value)} value={form.category}>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select
              className={inputClass}
              disabled={!availableProjects.length}
              onChange={(event) => {
                const nextProject = projects.find((project) => project.id === event.target.value);
                updateForm("projectId", event.target.value);
                updateForm("project", nextProject?.name ?? form.project);
              }}
              value={form.projectId}
            >
              {availableProjects.length ? (
                availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              ) : (
                <option value="">Create a project first</option>
              )}
            </select>
            {!availableProjects.length ? <span className="mt-1 block text-xs text-slate-500">Projects are managed from the Projects page.</span> : null}
          </Field>
          <Field label="Payment method">
            <select className={inputClass} onChange={(event) => updatePaymentMethod(event.target.value)} value={form.paymentMethod}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Funding account">
            <select className={inputClass} disabled={!availableFundingAccounts.length} onChange={(event) => updateForm("fundingAccountId", event.target.value)} value={form.fundingAccountId}>
              {availableFundingAccounts.length ? (
                availableFundingAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))
              ) : (
                <option value="">Create a matching account first</option>
              )}
            </select>
            {!availableFundingAccounts.length ? <span className="mt-1 block text-xs text-slate-500">Finance accounts are managed from the Finance page.</span> : null}
          </Field>
          <Field label="Paid by">
            <input className={inputClass} onChange={(event) => updateForm("paidBy", event.target.value)} placeholder="Team member" value={form.paidBy} />
          </Field>
          <Field className="lg:col-span-2" label="Description">
            <input className={inputClass} onChange={(event) => updateForm("description", event.target.value)} placeholder="What was paid for?" required value={form.description} />
          </Field>
          <Field label="Receipt reference">
            <input className={inputClass} onChange={(event) => updateForm("receiptReference", event.target.value)} placeholder="Receipt or invoice no." value={form.receiptReference} />
          </Field>
          <Field label="Bank transfer / reference number">
            <input className={inputClass} onChange={(event) => updateForm("transferReference", event.target.value)} placeholder="Optional transfer, cheque, or bank ref." value={form.transferReference} />
          </Field>
          <Field className="lg:col-span-2" label="Expense proofs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{expenseProofStatusLabel(form)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expenseHasProof(form)
                      ? `${form.attachments.length} proof file${form.attachments.length === 1 ? "" : "s"} linked to this expense.`
                      : "Attach receipt images or PDFs. Camera capture is available on supported mobile browsers."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    Add proofs
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    onClick={() => cameraInputRef.current?.click()}
                    type="button"
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    Use camera
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleAttachments.length ? (
                  visibleAttachments.map((attachment) => (
                    <AttachmentCard
                      key={attachment.id}
                      attachment={attachment}
                      onDownload={() => void openAttachment(attachment, "download")}
                      onOpen={() => void openAttachment(attachment, "open")}
                      onRemove={() => removeAttachment(attachment)}
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
                    No proof files are attached yet.
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Workspace JSON exports metadata only. Use the proof backup export to move actual images and PDFs between browsers.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => void handleExportProofBackup()}
                  type="button"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export expense proofs
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => proofBackupInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  Import proof backup
                </button>
              </div>
            </div>
          </Field>
          <Field className="lg:col-span-2" label="Proof notes">
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              onChange={(event) => updateForm("proofNotes", event.target.value)}
              placeholder="Anything the finance team should know about the attached proof files"
              value={form.proofNotes}
            />
          </Field>
          <Field className="lg:col-span-4" label="Notes">
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Approval notes, vendor context, or reconciliation details"
              value={form.notes}
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none" disabled={!availableProjects.length || !availableFundingAccounts.length}>
              {!availableProjects.length ? "Create project first" : !availableFundingAccounts.length ? `Create ${form.originalCurrency} account first` : editingId ? "Save changes" : "Add expense"}
            </button>
            {editingId ? (
              <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search description, project, receipt, paid by..."
              value={search}
            />
          </div>
          <select className={inputClass} onChange={(event) => setCurrencyFilter(event.target.value as "All" | Currency)} value={currencyFilter}>
            <option value="All">All original currencies</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | ApprovalStatus)} value={statusFilter}>
            <option value="All">All statuses</option>
            {approvalStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="All">All categories</option>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setProofFilter(event.target.value as "All" | "Attached" | "Missing")} value={proofFilter}>
            <option value="All">All expenses</option>
            <option value="Attached">Proof attached</option>
            <option value="Missing">Missing proof</option>
          </select>
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            onClick={exportCsv}
            type="button"
          >
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
          <select className={cn(inputClass, "lg:col-span-2")} onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="All">All projects</option>
            {projectNames.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <p className="self-center text-sm text-slate-500 lg:col-span-2">
            Showing {filteredExpenses.length} of {expenses.length} local expenses
          </p>
        </div>

        <div className="table-scroll">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Original amount</th>
                <th className="px-5 py-3 font-semibold">Converted amount</th>
                <th className="px-5 py-3 font-semibold">Rate</th>
                <th className="px-5 py-3 font-semibold">Paid by</th>
                <th className="px-5 py-3 font-semibold">Receipt</th>
                <th className="px-5 py-3 font-semibold">Proof</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => {
                const amounts = convertedExpenseAmounts(expense);

                return (
                <tr key={expense.id} className="align-top">
                  <td className="px-5 py-4 text-slate-500">{expense.date}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-950">{expense.description}</p>
                    <p className="mt-1 line-clamp-2 max-w-xs text-xs leading-5 text-slate-500">{expense.notes || expense.paymentMethod}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{expense.category}</td>
                  <td className="px-5 py-4 text-slate-500">{projectLabel(projects, expense)}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{originalExpenseLabel(expense)}</p>
                    <p className="mt-1 text-xs text-slate-500">Original {expense.originalCurrency}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{convertedExpenseLabel(expense)}</p>
                    <p className="mt-1 text-xs text-slate-500">Converted {amounts.convertedCurrency}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{expense.exchangeRate.toLocaleString("en-US")} PKR/USD</td>
                  <td className="px-5 py-4 text-slate-500">{expense.paidBy || "Not set"}</td>
                  <td className="px-5 py-4 text-slate-500">
                    <p>{expense.receiptReference || "None"}</p>
                    {expense.transferReference ? <p className="mt-1 text-xs text-slate-400">{expense.transferReference}</p> : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", expenseHasProof(expense) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      {expenseProofStatusLabel(expense)}
                    </div>
                    <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                      {expenseProofFileNames(expense).join(", ") || "No attachment files"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={expense.approvalStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                        onClick={() => editExpense(expense)}
                        type="button"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit expense</span>
                      </button>
                      <button
                        className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50"
                        onClick={() => deleteExpense(expense.id)}
                        type="button"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Delete expense</span>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {!filteredExpenses.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={12}>
                    No expenses match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <input accept={expenseProofAccept} className="hidden" multiple onChange={handleProofSelection} ref={fileInputRef} type="file" />
      <input accept="image/*,.heic,.heif,image/heic,image/heif" capture="environment" className="hidden" onChange={handleProofSelection} ref={cameraInputRef} type="file" />
      <input accept="application/json" className="hidden" onChange={handleImportProofBackup} ref={proofBackupInputRef} type="file" />
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function AttachmentCard({
  attachment,
  onDownload,
  onOpen,
  onRemove,
}: {
  attachment: LocalExpenseAttachmentMeta & { pending: boolean; previewUrl: string };
  onDownload: () => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {attachment.kind === "Image" && attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={attachment.fileName} className="h-36 w-full object-cover" src={attachment.previewUrl} />
      ) : (
        <div className="grid h-36 place-items-center bg-slate-50 text-slate-500">
          {attachment.kind === "PDF" ? <FileText className="size-8" aria-hidden="true" /> : <FileImage className="size-8" aria-hidden="true" />}
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Paperclip className="size-4 text-slate-400" aria-hidden="true" />
            <span className="truncate">{attachment.fileName}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {attachment.kind} · {formatFileSize(attachment.sizeBytes)}
            {attachment.pending ? " · Pending save" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onOpen} type="button">
            <Eye className="size-3.5" aria-hidden="true" />
            Open
          </button>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onDownload} type="button">
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </button>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50" onClick={onRemove} type="button">
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
