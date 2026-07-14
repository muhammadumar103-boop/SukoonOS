"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Banknote, Search, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { buildFinanceLedger, type FinanceLedgerEntry, type LedgerType } from "@/lib/finance/ledger";
import { formatMoney, type Currency } from "@/lib/finance/local-finance";
import { loadLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

const typeStyles: Record<LedgerType, string> = {
  Donation: "text-emerald-700",
  Expense: "text-red-700",
  Transfer: "text-slate-700",
  Refund: "text-amber-700",
  Fee: "text-orange-700",
  Adjustment: "text-teal-700",
};

const typeIcons = {
  Donation: ArrowDownLeft,
  Expense: ArrowUpRight,
  Transfer: ArrowRightLeft,
  Refund: ArrowDownLeft,
  Fee: Banknote,
  Adjustment: SlidersHorizontal,
};

export function FinanceLedger() {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | LedgerType>("All");
  const [currencyFilter, setCurrencyFilter] = useState<"All" | Currency>("All");
  const [projectFilter, setProjectFilter] = useState("All");

  useEffect(() => {
    setWorkspace(loadLocalWorkspace());
  }, []);

  const entries = useMemo(() => (workspace ? buildFinanceLedger(workspace) : []), [workspace]);
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
        result.PKR += entry.netPkrAmount;
        result.USD += entry.netUsdAmount;
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
            {(["Donation", "Expense", "Transfer", "Refund", "Fee", "Adjustment"] as LedgerType[]).map((type) => (
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
          <table className="w-full min-w-[1180px] text-left text-sm">
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
              {filteredEntries.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
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

function LedgerRow({ entry }: { entry: FinanceLedgerEntry }) {
  const Icon = typeIcons[entry.type];
  const amountTone = entry.netPkrAmount < 0 || entry.netUsdAmount < 0 ? "text-red-700" : entry.type === "Transfer" ? "text-slate-700" : "text-emerald-700";

  return (
    <tr className="align-top">
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
      <td className={cn("px-5 py-4 text-right", amountTone)}>
        <p className="font-semibold">{entry.originalLabel}</p>
        <p className="mt-1 text-xs text-slate-500">Original {entry.originalCurrency}</p>
      </td>
      <td className={cn("px-5 py-4 text-right", amountTone)}>
        <p className="font-semibold">{entry.convertedLabel}</p>
        <p className="mt-1 text-xs text-slate-500">{entry.exchangeRate.toLocaleString("en-US")} PKR/USD</p>
      </td>
      <td className={cn("px-5 py-4 text-right font-semibold", amountTone)}>{formatMoney(entry.pkrAmount, "PKR")}</td>
      <td className={cn("px-5 py-4 text-right font-semibold", amountTone)}>{formatMoney(entry.usdAmount, "USD")}</td>
    </tr>
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
