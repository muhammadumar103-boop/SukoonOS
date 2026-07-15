"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { DatabaseZap, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  exportLocalWorkspace,
  importLocalWorkspace,
  loadLocalWorkspace,
  maxLocalWorkspaceImportBytes,
  resetLocalWorkspace,
} from "@/lib/local-data/repository";

export function LocalWorkspaceBanner() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [sampleDataEnabled, setSampleDataEnabled] = useState(true);
  const [counts, setCounts] = useState({ expenses: 0, donations: 0, transfers: 0, accounts: 0, budgets: 0, donors: 0, financialRecords: 0 });

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
  }, []);

  function replaceWorkspace(nextSampleState: boolean) {
    const message = nextSampleState
      ? "Replace the current local workspace in this browser with fresh sample data?"
      : "Replace the current local workspace in this browser with an empty workspace?";

    if (!window.confirm(message)) {
      return;
    }

    resetLocalWorkspace({ sampleData: nextSampleState });
    window.location.reload();
  }

  function handleExport() {
    const json = exportLocalWorkspace();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sukoonos-workspace-${new Date().toISOString().replaceAll(":", "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The selected file could not be imported.";
      window.alert(`Workspace import failed: ${message}`);
      event.target.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm shadow-emerald-950/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-emerald-800">
            <DatabaseZap className="size-4" aria-hidden="true" />
            <p className="text-sm font-semibold">{sampleDataEnabled ? "Sample data is active" : "Local empty workspace is active"}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            {sampleDataEnabled
              ? "This browser is using seeded SukoonOS finance records for demos. Clearing sample data will replace this local workspace with an empty one after confirmation."
              : "This browser is using an empty local workspace. You can keep building from scratch or reload the sample workspace at any time."}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-900/70">Local demo records exist only in this browser unless you export them.</p>
          <p className="mt-2 text-xs text-emerald-900/70">
            {counts.accounts} accounts, {counts.budgets} budgets, {counts.donations} donations, {counts.transfers} transfers, {counts.financialRecords} other finance records, {counts.expenses} expenses, {counts.donors} donors
          </p>
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
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            <Upload className="size-4" aria-hidden="true" />
            Import JSON
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
    </section>
  );
}
