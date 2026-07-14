"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Banknote, Search } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { demoDonationsPageData, demoTransfers } from "@/data/demo-data";
import {
  convertedExpenseAmounts,
  defaultUsdToPkrRate,
  formatMoney,
  localExpenseStorageKey,
  normalizeLocalExpense,
  parseMoney,
  type Currency,
  type LocalExpense,
} from "@/lib/finance/local-finance";
import { cn } from "@/lib/utils";

type LedgerType = "Donation" | "Expense" | "Transfer" | "Refund" | "Fee" | "Other";

type LedgerEntry = {
  id: string;
  date: string;
  type: LedgerType;
  description: string;
  project: string;
  party: string;
  method: string;
  reference: string;
  status: string;
  originalCurrency: Currency;
  originalAmount: number;
  exchangeRate: number;
  pkrAmount: number;
  usdAmount: number;
  convertedLabel: string;
  originalLabel: string;
};

const typeStyles: Record<LedgerType, string> = {
  Donation: "text-emerald-700",
  Expense: "text-red-700",
  Transfer: "text-slate-700",
  Refund: "text-amber-700",
  Fee: "text-orange-700",
  Other: "text-slate-700",
};

const typeIcons = {
  Donation: ArrowDownLeft,
  Expense: ArrowUpRight,
  Transfer: ArrowRightLeft,
  Refund: ArrowDownLeft,
  Fee: Banknote,
  Other: Banknote,
};

const staticLedgerEntries: LedgerEntry[] = [
  ...demoDonationsPageData.donations.map((donation, index) => ({
    id: `ledger-${donation.id}`,
    date: isoDateFromDemoDate(donation.date, index),
    type: "Donation" as const,
    description: `Donation from ${donation.donor}`,
    project: donation.fund,
    party: donation.donor,
    method: donation.method,
    reference: `DON-${String(index + 1).padStart(4, "0")}`,
    status: donation.status,
    originalCurrency: "USD" as const,
    originalAmount: parseMoney(donation.amount),
    exchangeRate: defaultUsdToPkrRate,
    pkrAmount: parseMoney(donation.amount) * defaultUsdToPkrRate,
    usdAmount: parseMoney(donation.amount),
    originalLabel: formatMoney(parseMoney(donation.amount), "USD"),
    convertedLabel: formatMoney(parseMoney(donation.amount) * defaultUsdToPkrRate, "PKR"),
  })),
  ...demoTransfers.map((transfer, index) => ({
    id: `ledger-${transfer.id}`,
    date: isoDateFromDemoDate(transfer.date, index + 4),
    type: "Transfer" as const,
    description: `${transfer.from} to ${transfer.to}`,
    project: transfer.to,
    party: transfer.from,
    method: "Internal Transfer",
    reference: `TRF-${String(index + 1).padStart(4, "0")}`,
    status: transfer.status,
    originalCurrency: "USD" as const,
    originalAmount: 0,
    exchangeRate: defaultUsdToPkrRate,
    pkrAmount: 0,
    usdAmount: 0,
    originalLabel: formatMoney(0, "USD"),
    convertedLabel: formatMoney(0, "PKR"),
  })),
  {
    id: "ledger-refund-1",
    date: "2026-07-08",
    type: "Refund",
    description: "Vendor refund for duplicate medical supply invoice",
    project: "Hospital Project",
    party: "City Medical Supplies",
    method: "Bank Transfer",
    reference: "REF-1021",
    status: "Received",
    originalCurrency: "PKR",
    originalAmount: 85000,
    exchangeRate: 278,
    pkrAmount: 85000,
    usdAmount: 85000 / 278,
    originalLabel: formatMoney(85000, "PKR"),
    convertedLabel: formatMoney(85000 / 278, "USD"),
  },
  {
    id: "ledger-fee-1",
    date: "2026-07-07",
    type: "Fee",
    description: "Bank transfer fee for program account movement",
    project: "General Operations",
    party: "Bank",
    method: "Bank Transfer",
    reference: "FEE-3308",
    status: "Paid",
    originalCurrency: "PKR",
    originalAmount: -2600,
    exchangeRate: 278,
    pkrAmount: -2600,
    usdAmount: -2600 / 278,
    originalLabel: formatMoney(-2600, "PKR"),
    convertedLabel: formatMoney(-2600 / 278, "USD"),
  },
  {
    id: "ledger-other-1",
    date: "2026-07-05",
    type: "Other",
    description: "Opening balance adjustment for local demo ledger",
    project: "General Operations",
    party: "Finance",
    method: "Adjustment",
    reference: "ADJ-0001",
    status: "Approved",
    originalCurrency: "USD",
    originalAmount: 15000,
    exchangeRate: defaultUsdToPkrRate,
    pkrAmount: 15000 * defaultUsdToPkrRate,
    usdAmount: 15000,
    originalLabel: formatMoney(15000, "USD"),
    convertedLabel: formatMoney(15000 * defaultUsdToPkrRate, "PKR"),
  },
];

function isoDateFromDemoDate(value: string, fallbackOffset: number) {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return new Date(Date.now() - fallbackOffset * 86400000).toISOString().slice(0, 10);
}

function localExpenseToLedger(expense: LocalExpense): LedgerEntry {
  const amounts = convertedExpenseAmounts(expense);
  const sign = -1;

  return {
    id: `ledger-${expense.id}`,
    date: expense.date,
    type: "Expense",
    description: expense.description,
    project: expense.project,
    party: expense.paidBy || "Not set",
    method: expense.paymentMethod,
    reference: expense.receiptReference || "No receipt",
    status: expense.approvalStatus,
    originalCurrency: expense.originalCurrency,
    originalAmount: sign * Math.abs(expense.originalAmount),
    exchangeRate: expense.exchangeRate,
    pkrAmount: sign * Math.abs(amounts.pkr),
    usdAmount: sign * Math.abs(amounts.usd),
    originalLabel: formatMoney(sign * Math.abs(expense.originalAmount), expense.originalCurrency),
    convertedLabel: formatMoney(sign * Math.abs(amounts.convertedAmount), amounts.convertedCurrency),
  };
}

export function FinanceLedger() {
  const [localExpenses, setLocalExpenses] = useState<LocalExpense[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | LedgerType>("All");
  const [currencyFilter, setCurrencyFilter] = useState<"All" | Currency>("All");
  const [projectFilter, setProjectFilter] = useState("All");

  useEffect(() => {
    const saved = window.localStorage.getItem(localExpenseStorageKey);

    if (!saved) {
      setLocalExpenses([]);
      return;
    }

    try {
      setLocalExpenses((JSON.parse(saved) as LocalExpense[]).map(normalizeLocalExpense));
    } catch {
      setLocalExpenses([]);
    }
  }, []);

  const entries = useMemo(() => {
    return [...localExpenses.map(localExpenseToLedger), ...staticLedgerEntries].sort((a, b) => b.date.localeCompare(a.date));
  }, [localExpenses]);

  const projects = useMemo(() => Array.from(new Set(entries.map((entry) => entry.project))).sort(), [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const searchable = [
        entry.date,
        entry.type,
        entry.description,
        entry.project,
        entry.party,
        entry.method,
        entry.reference,
        entry.status,
        entry.originalCurrency,
        entry.exchangeRate,
        entry.originalLabel,
        entry.convertedLabel,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (typeFilter === "All" || entry.type === typeFilter) &&
        (currencyFilter === "All" || entry.originalCurrency === currencyFilter) &&
        (projectFilter === "All" || entry.project === projectFilter)
      );
    });
  }, [currencyFilter, entries, projectFilter, search, typeFilter]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (result, entry) => {
        result.PKR += entry.pkrAmount;
        result.USD += entry.usdAmount;
        return result;
      },
      { PKR: 0, USD: 0 },
    );
  }, [filteredEntries]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Visible PKR net" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="Visible USD net" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="Ledger entries" value={String(filteredEntries.length)} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-3 border-b border-emerald-100 p-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ledger, project, party, method, reference..."
              value={search}
            />
          </div>
          <select className={inputClass} onChange={(event) => setTypeFilter(event.target.value as "All" | LedgerType)} value={typeFilter}>
            <option value="All">All movement types</option>
            {(["Donation", "Expense", "Transfer", "Refund", "Fee", "Other"] as LedgerType[]).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setCurrencyFilter(event.target.value as "All" | Currency)} value={currencyFilter}>
            <option value="All">All original currencies</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
          <select className={inputClass} onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="All">All projects</option>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Party</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Original amount</th>
                <th className="px-5 py-3 text-right font-semibold">Converted amount</th>
                <th className="px-5 py-3 text-right font-semibold">PKR value</th>
                <th className="px-5 py-3 text-right font-semibold">USD value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const Icon = typeIcons[entry.type];
                return (
                  <tr key={entry.id} className="align-top">
                    <td className="px-5 py-4 text-slate-500">{entry.date}</td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-2 font-medium", typeStyles[entry.type])}>
                        <Icon className="size-4" aria-hidden="true" />
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-950">{entry.description}</td>
                    <td className="px-5 py-4 text-slate-500">{entry.project}</td>
                    <td className="px-5 py-4 text-slate-500">{entry.party}</td>
                    <td className="px-5 py-4 text-slate-500">{entry.method}</td>
                    <td className="px-5 py-4 text-slate-500">{entry.reference}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={entry.status} />
                    </td>
                    <td className={cn("px-5 py-4 text-right", entry.originalAmount < 0 ? "text-red-700" : "text-emerald-700")}>
                      <p className="font-semibold">{entry.originalLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">Original {entry.originalCurrency}</p>
                    </td>
                    <td className={cn("px-5 py-4 text-right", entry.pkrAmount < 0 || entry.usdAmount < 0 ? "text-red-700" : "text-emerald-700")}>
                      <p className="font-semibold">{entry.convertedLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{entry.exchangeRate.toLocaleString("en-US")} PKR/USD</p>
                    </td>
                    <td className={cn("px-5 py-4 text-right font-semibold", entry.pkrAmount < 0 ? "text-red-700" : "text-emerald-700")}>
                      {formatMoney(entry.pkrAmount, "PKR")}
                    </td>
                    <td className={cn("px-5 py-4 text-right font-semibold", entry.usdAmount < 0 ? "text-red-700" : "text-emerald-700")}>
                      {formatMoney(entry.usdAmount, "USD")}
                    </td>
                  </tr>
                );
              })}
              {!filteredEntries.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={12}>
                    No ledger entries match the current filters.
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

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
