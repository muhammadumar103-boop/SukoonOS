"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Download, Pencil, Search, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { defaultUsdToPkrRate, formatMoney, sukoonProjects, type Currency, type FinanceAccount } from "@/lib/finance/local-finance";
import { moneyValues } from "@/lib/local-data/migrations";
import { loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalTransfer, LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

type TransferStatus = LocalTransfer["status"];

const transferStatuses: TransferStatus[] = ["Draft", "Review", "Scheduled", "Completed", "Cancelled"];

type TransferForm = {
  fromAccountId: string;
  toAccountId: string;
  project: string;
  date: string;
  status: TransferStatus;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  reference: string;
  notes: string;
};

const emptyForm: TransferForm = {
  fromAccountId: "main-donations-bank",
  toAccountId: "operations-bank-pkr",
  project: sukoonProjects[0],
  date: new Date().toISOString().slice(0, 10),
  status: "Review",
  originalAmount: 0,
  originalCurrency: "USD",
  exchangeRate: defaultUsdToPkrRate,
  reference: "",
  notes: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function transferToForm(transfer: LocalTransfer): TransferForm {
  return {
    fromAccountId: transfer.fromAccountId,
    toAccountId: transfer.toAccountId,
    project: transfer.project,
    date: transfer.date,
    status: transfer.status,
    originalAmount: transfer.originalAmount,
    originalCurrency: transfer.originalCurrency,
    exchangeRate: transfer.exchangeRate,
    reference: transfer.reference,
    notes: transfer.notes,
  };
}

export function LocalTransfersManager() {
  const workspaceRef = useRef<LocalWorkspace | null>(null);
  const [transfers, setTransfers] = useState<LocalTransfer[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [form, setForm] = useState<TransferForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | TransferStatus>("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const workspace = loadLocalWorkspace();
    workspaceRef.current = workspace;
    setTransfers(workspace.transfers);
    setAccounts(workspace.financeAccounts);
    setForm((current) => ({
      ...current,
      fromAccountId: workspace.financeAccounts[0]?.id ?? current.fromAccountId,
      toAccountId: workspace.financeAccounts[1]?.id ?? current.toAccountId,
    }));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !workspaceRef.current) {
      return;
    }

    workspaceRef.current = saveLocalWorkspace({ ...workspaceRef.current, transfers });
  }, [hydrated, transfers]);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const fromAccount = accounts.find((account) => account.id === transfer.fromAccountId)?.name ?? "";
      const toAccount = accounts.find((account) => account.id === transfer.toAccountId)?.name ?? "";
      const searchable = [transfer.date, fromAccount, toAccount, transfer.project, transfer.status, transfer.reference, transfer.notes, transfer.originalCurrency].join(" ").toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "All" || transfer.status === statusFilter) &&
        (projectFilter === "All" || transfer.project === projectFilter)
      );
    });
  }, [accounts, projectFilter, search, statusFilter, transfers]);

  const totals = useMemo(() => {
    return filteredTransfers.reduce(
      (result, transfer) => {
        if (transfer.status !== "Cancelled" && transfer.status !== "Draft") {
          result.PKR += transfer.pkrAmount;
          result.USD += transfer.usdAmount;
        }
        return result;
      },
      { PKR: 0, USD: 0 },
    );
  }, [filteredTransfers]);

  function updateForm<Key extends keyof TransferForm>(key: Key, value: TransferForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      fromAccountId: accounts[0]?.id ?? emptyForm.fromAccountId,
      toAccountId: accounts[1]?.id ?? emptyForm.toAccountId,
    });
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fromAccountId || !form.toAccountId || form.fromAccountId === form.toAccountId) {
      return;
    }

    const nextTransfer: LocalTransfer = {
      id: editingId ?? createId(),
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      project: form.project,
      date: form.date,
      status: form.status,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
      ...moneyValues(Number(form.originalAmount), form.originalCurrency, Number(form.exchangeRate)),
    };

    setTransfers((current) => (editingId ? current.map((transfer) => (transfer.id === editingId ? nextTransfer : transfer)) : [nextTransfer, ...current]));
    resetForm();
  }

  function exportCsv() {
    const headers = ["Date", "From", "To", "Original Amount", "Original Currency", "Exchange Rate", "PKR Value", "USD Value", "Project", "Reference", "Status", "Notes"];
    const rows = filteredTransfers.map((transfer) => [
      transfer.date,
      accounts.find((account) => account.id === transfer.fromAccountId)?.name ?? transfer.fromAccountId,
      accounts.find((account) => account.id === transfer.toAccountId)?.name ?? transfer.toAccountId,
      transfer.originalAmount,
      transfer.originalCurrency,
      transfer.exchangeRate,
      transfer.pkrAmount,
      transfer.usdAmount,
      transfer.project,
      transfer.reference,
      transfer.status,
      transfer.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sukoonos-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Transfer volume PKR" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="Transfer volume USD" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="Transfer records" value={String(filteredTransfers.length)} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit transfer" : "New transfer"}</h2>
        <p className="mt-1 text-sm text-slate-500">Transfers update account balances but do not count as income or expenses.</p>

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <Field label="Date">
            <input className={inputClass} onChange={(event) => updateForm("date", event.target.value)} required type="date" value={form.date} />
          </Field>
          <Field label="From account">
            <select className={inputClass} onChange={(event) => updateForm("fromAccountId", event.target.value)} value={form.fromAccountId}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To account">
            <select className={inputClass} onChange={(event) => updateForm("toAccountId", event.target.value)} value={form.toAccountId}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} onChange={(event) => updateForm("status", event.target.value as TransferStatus)} value={form.status}>
              {transferStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Original amount">
            <input className={inputClass} min="0" onChange={(event) => updateForm("originalAmount", Number(event.target.value))} required step="0.01" type="number" value={form.originalAmount} />
          </Field>
          <Field label="Original currency">
            <select className={inputClass} onChange={(event) => updateForm("originalCurrency", event.target.value as Currency)} value={form.originalCurrency}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Exchange rate">
            <input className={inputClass} min="0.0001" onChange={(event) => updateForm("exchangeRate", Number(event.target.value))} required step="0.0001" type="number" value={form.exchangeRate} />
          </Field>
          <Field label="Project or purpose">
            <select className={inputClass} onChange={(event) => updateForm("project", event.target.value)} value={form.project}>
              {sukoonProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
              <option value="Field Operations">Field Operations</option>
            </select>
          </Field>
          <Field label="Reference">
            <input className={inputClass} onChange={(event) => updateForm("reference", event.target.value)} placeholder="Transfer reference" value={form.reference} />
          </Field>
          <Field className="lg:col-span-3" label="Notes">
            <input className={inputClass} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Reason, approval, or reconciliation details" value={form.notes} />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800">
              {editingId ? "Save changes" : "Create transfer"}
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
        <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts, project, reference..." value={search} />
          </div>
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | TransferStatus)} value={statusFilter}>
            <option value="All">All statuses</option>
            {transferStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="All">All projects</option>
            {Array.from(new Set(transfers.map((transfer) => transfer.project))).map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <button className="flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={exportCsv} type="button">
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
        </div>

        <div className="space-y-4 p-5">
          {filteredTransfers.map((transfer) => {
            const from = accounts.find((account) => account.id === transfer.fromAccountId);
            const to = accounts.find((account) => account.id === transfer.toAccountId);

            return (
              <article key={transfer.id} className="rounded-lg border border-slate-100 p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{from?.name ?? "Unknown account"}</p>
                    <p className="mt-1 text-xs text-slate-500">{from?.currency ?? transfer.originalCurrency}</p>
                  </div>
                  <div className="hidden size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 lg:grid">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">To</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{to?.name ?? "Unknown account"}</p>
                    <p className="mt-1 text-xs text-slate-500">{to?.currency ?? transfer.originalCurrency}</p>
                  </div>
                  <div className="flex flex-col gap-2 lg:items-end">
                    <p className="text-xl font-semibold text-slate-950">{formatMoney(transfer.originalAmount, transfer.originalCurrency)}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">{transfer.date}</span>
                      <StatusBadge value={transfer.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
                  <p className="text-slate-500">Project: <span className="font-medium text-slate-950">{transfer.project}</span></p>
                  <p className="text-slate-500">PKR: <span className="font-medium text-slate-950">{formatMoney(transfer.pkrAmount, "PKR")}</span></p>
                  <p className="text-slate-500">USD: <span className="font-medium text-slate-950">{formatMoney(transfer.usdAmount, "USD")}</span></p>
                  <p className="text-slate-500">Ref: <span className="font-medium text-slate-950">{transfer.reference || "None"}</span></p>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => { setForm(transferToForm(transfer)); setEditingId(transfer.id); }} type="button">
                    <Pencil className="size-4" aria-hidden="true" />
                    <span className="sr-only">Edit transfer</span>
                  </button>
                  <button className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50" onClick={() => setTransfers((current) => current.filter((item) => item.id !== transfer.id))} type="button">
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Delete transfer</span>
                  </button>
                </div>
              </article>
            );
          })}
          {!filteredTransfers.length ? <p className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">No transfers match the current filters.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
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

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
