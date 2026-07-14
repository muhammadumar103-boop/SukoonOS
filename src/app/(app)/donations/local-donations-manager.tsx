"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Search, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { defaultUsdToPkrRate, formatMoney, sukoonProjects, type Currency, type FinanceAccount } from "@/lib/finance/local-finance";
import { moneyValues } from "@/lib/local-data/migrations";
import { loadLocalWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalDonation, LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

type DonationStatus = LocalDonation["status"];

const donationStatuses: DonationStatus[] = ["Pledged", "Processing", "Received", "Refunded", "Cancelled"];
const donationMethods = ["Bank Transfer", "Card", "Cheque", "Cash", "Mobile Wallet"];

type DonationForm = {
  donorName: string;
  project: string;
  accountId: string;
  method: string;
  date: string;
  status: DonationStatus;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  receiptReference: string;
  notes: string;
};

const emptyForm: DonationForm = {
  donorName: "",
  project: sukoonProjects[0],
  accountId: "main-donations-bank",
  method: donationMethods[0],
  date: new Date().toISOString().slice(0, 10),
  status: "Received",
  originalAmount: 0,
  originalCurrency: "USD",
  exchangeRate: defaultUsdToPkrRate,
  receiptReference: "",
  notes: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `donation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function donationToForm(donation: LocalDonation): DonationForm {
  return {
    donorName: donation.donorName,
    project: donation.project,
    accountId: donation.accountId,
    method: donation.method,
    date: donation.date,
    status: donation.status,
    originalAmount: donation.originalAmount,
    originalCurrency: donation.originalCurrency,
    exchangeRate: donation.exchangeRate,
    receiptReference: donation.receiptReference,
    notes: donation.notes,
  };
}

export function LocalDonationsManager() {
  const workspaceRef = useRef<LocalWorkspace | null>(null);
  const [donations, setDonations] = useState<LocalDonation[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [form, setForm] = useState<DonationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DonationStatus>("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const workspace = loadLocalWorkspace();
    workspaceRef.current = workspace;
    setDonations(workspace.donations);
    setAccounts(workspace.financeAccounts);
    setForm((current) => ({
      ...current,
      accountId: workspace.financeAccounts.find((account) => account.currency === current.originalCurrency)?.id ?? current.accountId,
    }));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !workspaceRef.current) {
      return;
    }

    workspaceRef.current = saveLocalWorkspace({ ...workspaceRef.current, donations });
  }, [donations, hydrated]);

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return donations.filter((donation) => {
      const searchable = [
        donation.donorName,
        donation.project,
        donation.method,
        donation.date,
        donation.status,
        donation.receiptReference,
        donation.notes,
        donation.originalCurrency,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "All" || donation.status === statusFilter) &&
        (projectFilter === "All" || donation.project === projectFilter)
      );
    });
  }, [donations, projectFilter, search, statusFilter]);

  const totals = useMemo(() => {
    return filteredDonations.reduce(
      (result, donation) => {
        if (donation.status === "Received") {
          result.PKR += donation.pkrAmount;
          result.USD += donation.usdAmount;
        }
        return result;
      },
      { PKR: 0, USD: 0 },
    );
  }, [filteredDonations]);

  function updateForm<Key extends keyof DonationForm>(key: Key, value: DonationForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCurrency(currency: Currency) {
    setForm((current) => ({
      ...current,
      originalCurrency: currency,
      accountId: accounts.find((account) => account.currency === currency)?.id ?? current.accountId,
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      accountId: accounts.find((account) => account.currency === emptyForm.originalCurrency)?.id ?? emptyForm.accountId,
    });
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const donorName = form.donorName.trim();
    if (!donorName) {
      return;
    }

    const nextDonation: LocalDonation = {
      id: editingId ?? createId(),
      donorId: donorName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `donor-${Date.now()}`,
      donorName,
      project: form.project,
      accountId: form.accountId,
      method: form.method,
      date: form.date,
      status: form.status,
      receiptReference: form.receiptReference.trim(),
      notes: form.notes.trim(),
      ...moneyValues(Number(form.originalAmount), form.originalCurrency, Number(form.exchangeRate)),
    };

    setDonations((current) => (editingId ? current.map((donation) => (donation.id === editingId ? nextDonation : donation)) : [nextDonation, ...current]));
    resetForm();
  }

  function exportCsv() {
    const headers = ["Date", "Donor", "Original Amount", "Original Currency", "Exchange Rate", "PKR Value", "USD Value", "Project", "Method", "Account", "Receipt", "Status", "Notes"];
    const rows = filteredDonations.map((donation) => [
      donation.date,
      donation.donorName,
      donation.originalAmount,
      donation.originalCurrency,
      donation.exchangeRate,
      donation.pkrAmount,
      donation.usdAmount,
      donation.project,
      donation.method,
      accounts.find((account) => account.id === donation.accountId)?.name ?? donation.accountId,
      donation.receiptReference,
      donation.status,
      donation.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sukoonos-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Received PKR" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="Received USD" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="Donation records" value={String(filteredDonations.length)} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit donation" : "Record donation"}</h2>
        <p className="mt-1 text-sm text-slate-500">Saved locally in demo mode and reflected in the Finance Ledger.</p>

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <Field label="Date">
            <input className={inputClass} onChange={(event) => updateForm("date", event.target.value)} required type="date" value={form.date} />
          </Field>
          <Field label="Donor">
            <input className={inputClass} onChange={(event) => updateForm("donorName", event.target.value)} placeholder="Donor name" required value={form.donorName} />
          </Field>
          <Field label="Original amount">
            <input className={inputClass} min="0" onChange={(event) => updateForm("originalAmount", Number(event.target.value))} required step="0.01" type="number" value={form.originalAmount} />
          </Field>
          <Field label="Original currency">
            <select className={inputClass} onChange={(event) => updateCurrency(event.target.value as Currency)} value={form.originalCurrency}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Exchange rate">
            <input className={inputClass} min="0.0001" onChange={(event) => updateForm("exchangeRate", Number(event.target.value))} required step="0.0001" type="number" value={form.exchangeRate} />
          </Field>
          <Field label="Project">
            <select className={inputClass} onChange={(event) => updateForm("project", event.target.value)} value={form.project}>
              {sukoonProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Funding account">
            <select className={inputClass} onChange={(event) => updateForm("accountId", event.target.value)} value={form.accountId}>
              {accounts
                .filter((account) => account.currency === form.originalCurrency)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Method">
            <select className={inputClass} onChange={(event) => updateForm("method", event.target.value)} value={form.method}>
              {donationMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} onChange={(event) => updateForm("status", event.target.value as DonationStatus)} value={form.status}>
              {donationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Receipt reference">
            <input className={inputClass} onChange={(event) => updateForm("receiptReference", event.target.value)} placeholder="Receipt no." value={form.receiptReference} />
          </Field>
          <Field className="lg:col-span-3" label="Notes">
            <input className={inputClass} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Allocation or stewardship notes" value={form.notes} />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800">
              {editingId ? "Save changes" : "Record donation"}
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
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search donor, project, method, receipt..." value={search} />
          </div>
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | DonationStatus)} value={statusFilter}>
            <option value="All">All statuses</option>
            {donationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="All">All projects</option>
            {sukoonProjects.map((project) => (
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Donor</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 text-right font-semibold">Original</th>
                <th className="px-5 py-3 text-right font-semibold">PKR value</th>
                <th className="px-5 py-3 text-right font-semibold">USD value</th>
                <th className="px-5 py-3 font-semibold">Receipt</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.map((donation) => (
                <tr key={donation.id} className="align-top">
                  <td className="px-5 py-4 text-slate-500">{donation.date}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{donation.donorName}</p>
                    <p className="mt-1 text-xs text-slate-500">{donation.method}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{donation.project}</td>
                  <td className="px-5 py-4 text-slate-500">{accounts.find((account) => account.id === donation.accountId)?.name ?? "Not set"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">{formatMoney(donation.originalAmount, donation.originalCurrency)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatMoney(donation.pkrAmount, "PKR")}</td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatMoney(donation.usdAmount, "USD")}</td>
                  <td className="px-5 py-4 text-slate-500">{donation.receiptReference || "None"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge value={donation.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => { setForm(donationToForm(donation)); setEditingId(donation.id); }} type="button">
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit donation</span>
                      </button>
                      <button className="grid size-9 place-items-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50" onClick={() => setDonations((current) => current.filter((item) => item.id !== donation.id))} type="button">
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Delete donation</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredDonations.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={10}>
                    No donations match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
