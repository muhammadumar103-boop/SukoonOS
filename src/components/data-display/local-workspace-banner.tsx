"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { DatabaseZap, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { FormNotice, type FormNoticeTone } from "@/components/data-display/form-notice";
import { exportExpenseProofBackup, importExpenseProofBackup } from "@/lib/local-data/expense-proofs";
import {
  exportLocalWorkspace,
  importLocalWorkspace,
  loadLocalWorkspace,
  maxLocalWorkspaceImportBytes,
  resetLocalWorkspace,
} from "@/lib/local-data/repository";
import { triggerDownload } from "@/lib/ui/downloads";
import { readTransientNotice, writeTransientNotice } from "@/lib/ui/transient-notice";

type NoticeState = {
  message: string;
  tone: FormNoticeTone;
};

export function LocalWorkspaceBanner() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const proofImportInputRef = useRef<HTMLInputElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sampleDataEnabled, setSampleDataEnabled] = useState(true);
  const [counts, setCounts] = useState({ expenses: 0, donations: 0, transfers: 0, accounts: 0, budgets: 0, donors: 0, financialRecords: 0 });
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    const workspace = loadLocalWorkspace();
    setSampleDataEnabled(workspace.sampleDataEnabled);
    setCounts({
      expenses: workspace.expenses.length,
      donations: workspace.donations.length,
      transfers: workspace.transfers.length,
      accounts: workspace.financeAccounts.length,
      budgets: workspace.financeBudgets.length,
      donors: workspace.donors.length,
      financialRecords: workspace.financialRecords.length,
    });
    setNotice(readTransientNotice());
    setHydrated(true);
  }, []);

  function replaceWorkspace(nextSampleState: boolean) {
    const message = nextSampleState
      ? "Replace the current local workspace in this browser with fresh sample data?"
      : "Replace the current local workspace in this browser with an empty workspace?";

    if (!window.confirm(message)) {
      return;
    }

    writeTransientNotice({
      tone: "success",
      message: nextSampleState
        ? "Fresh sample data replaced the previous browser workspace. A backup was saved first."
        : "The browser workspace was cleared after saving a backup of the previous records.",
    });
    resetLocalWorkspace({ sampleData: nextSampleState });
    window.location.reload();
  }

  function handleExport() {
    try {
      const json = exportLocalWorkspace();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, `sukoonos-workspace-${new Date().toISOString().replaceAll(":", "-")}.json`);
      setNotice({ tone: "success", message: "Workspace JSON exported from this browser." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The workspace export could not be created.";
      setNotice({ tone: "error", message });
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm("Importing a workspace will replace the current local workspace after creating a browser backup. Continue?");
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      if (file.size > maxLocalWorkspaceImportBytes) {
        throw new Error(`The selected file is larger than ${Math.round(maxLocalWorkspaceImportBytes / 1024 / 1024)} MB.`);
      }

      const text = await file.text();
      importLocalWorkspace(text);
      writeTransientNotice({
        tone: "success",
        message: `Workspace JSON imported from ${file.name}. A browser backup was created first.`,
      });
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The selected file could not be imported.";
      setNotice({ tone: "error", message: `Workspace import failed: ${message}` });
      event.target.value = "";
    }
  }

  async function handleProofExport() {
    try {
      const json = await exportExpenseProofBackup();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, `sukoonos-expense-proofs-${new Date().toISOString().replaceAll(":", "-")}.json`);
      setNotice({ tone: "success", message: "Expense proof backup exported from this browser." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Expense proof backup could not be exported.";
      setNotice({ tone: "error", message: `Expense proof export failed: ${message}` });
    }
  }

  async function handleProofImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Importing expense proofs will restore files and any missing proof metadata after creating a browser backup. Continue?",
    );
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      await importExpenseProofBackup(text);
      writeTransientNotice({
        tone: "success",
        message: `Expense proof backup imported from ${file.name}. A browser backup was created first.`,
      });
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Expense proof backup could not be imported.";
      setNotice({ tone: "error", message: `Expense proof import failed: ${message}` });
      event.target.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm shadow-emerald-950/5">
      {notice ? <div className="mb-4"><FormNotice message={notice.message} tone={notice.tone} /></div> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-emerald-800">
            <DatabaseZap className="size-4" aria-hidden="true" />
            <p className="text-sm font-semibold">
              {hydrated ? (sampleDataEnabled ? "Sample data is active" : "Local empty workspace is active") : "Loading local workspace..."}
            </p>
          </div>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            {hydrated && sampleDataEnabled
              ? "This browser is using seeded SukoonOS finance records for demos. Clearing sample data will replace this local workspace with an empty one after confirmation."
              : hydrated
                ? "This browser is using an empty local workspace. You can keep building from scratch or reload the sample workspace at any time."
                : "Checking the records saved in this browser."}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-900/70">Local demo records exist only in this browser unless you export them.</p>
          <p className="mt-1 text-xs text-emerald-900/70">
            Workspace JSON exports include expense-proof metadata only. Use the expense proof backup to move actual images and PDFs.
          </p>
          {hydrated ? (
            <p className="mt-2 text-xs text-emerald-900/70">
              {counts.accounts} accounts, {counts.budgets} budgets, {counts.donations} donations, {counts.transfers} transfers, {counts.financialRecords} other finance records, {counts.expenses} expenses, {counts.donors} donors
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            onClick={handleExport}
            type="button"
          >
            <Download className="size-4" aria-hidden="true" />
            Export JSON
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            onClick={() => void handleProofExport()}
            type="button"
          >
            <Download className="size-4" aria-hidden="true" />
            Export expense proofs
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            <Upload className="size-4" aria-hidden="true" />
            Import JSON
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            onClick={() => proofImportInputRef.current?.click()}
            type="button"
          >
            <Upload className="size-4" aria-hidden="true" />
            Import expense proofs
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            onClick={() => replaceWorkspace(true)}
            type="button"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reload sample data
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            onClick={() => replaceWorkspace(false)}
            type="button"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Clear sample data
          </button>
        </div>
      </div>
      <input accept="application/json" className="hidden" onChange={handleImport} ref={importInputRef} type="file" />
      <input accept="application/json" className="hidden" onChange={handleProofImport} ref={proofImportInputRef} type="file" />
    </section>
  );
}
