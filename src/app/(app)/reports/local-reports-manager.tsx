"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileJson, Search } from "lucide-react";
import { expenseCategories } from "@/lib/finance/local-finance";
import { generateReport, reportTypes, type ReportFilters, type ReportType } from "@/lib/local-data/reporting";
import { loadLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalWorkspace } from "@/lib/local-data/schema";
import { cn } from "@/lib/utils";

const emptyFilters: ReportFilters = {
  accountId: "",
  category: "",
  currency: "All",
  dateFrom: "",
  dateTo: "",
  donorId: "",
  projectId: "",
  search: "",
  status: "",
};

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function LocalReportsManager() {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [reportType, setReportType] = useState<ReportType>("monthly-donations");
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);

  useEffect(() => {
    setWorkspace(loadLocalWorkspace());
  }, []);

  const report = useMemo(() => (workspace ? generateReport(workspace, reportType, filters) : null), [filters, reportType, workspace]);

  function updateFilter<Key extends keyof ReportFilters>(key: Key, value: ReportFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCsv() {
    if (!report) {
      return;
    }

    const headers = report.columns.map((column) => column.label);
    const rows = report.rows.map((row) => report.columns.map((column) => row[column.key] ?? ""));
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = report.csvFileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPayload() {
    if (!report) {
      return;
    }

    const blob = new Blob([JSON.stringify(report.payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = report.csvFileName.replace(/\.csv$/, ".payload.json");
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!workspace || !report) {
    return <div className="rounded-lg border border-emerald-100 bg-white p-5 text-sm text-slate-500 shadow-sm shadow-emerald-950/5">Loading reports...</div>;
  }

  const statusOptions = Array.from(
    new Set([
      ...workspace.donations.map((donation) => donation.status),
      ...workspace.expenses.map((expense) => expense.approvalStatus),
      ...workspace.transfers.map((transfer) => transfer.status),
      ...workspace.approvals.map((approval) => approval.status),
    ]),
  ).sort();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <Field label="Report type">
            <select className={inputClass} onChange={(event) => setReportType(event.target.value as ReportType)} value={reportType}>
              {reportTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date from">
            <input className={inputClass} onChange={(event) => updateFilter("dateFrom", event.target.value)} type="date" value={filters.dateFrom} />
          </Field>
          <Field label="Date to">
            <input className={inputClass} onChange={(event) => updateFilter("dateTo", event.target.value)} type="date" value={filters.dateTo} />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search visible report rows..." value={filters.search} />
          </div>
          <select className={inputClass} onChange={(event) => updateFilter("projectId", event.target.value)} value={filters.projectId}>
            <option value="">All projects</option>
            {workspace.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => updateFilter("category", event.target.value)} value={filters.category}>
            <option value="">All categories</option>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => updateFilter("accountId", event.target.value)} value={filters.accountId}>
            <option value="">All accounts</option>
            {workspace.financeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => updateFilter("donorId", event.target.value)} value={filters.donorId}>
            <option value="">All donors</option>
            {workspace.donors.map((donor) => (
              <option key={donor.id} value={donor.id}>
                {donor.fullName}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => updateFilter("currency", event.target.value as ReportFilters["currency"])} value={filters.currency}>
            <option value="All">All currencies</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
          <button className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setFilters(emptyFilters)} type="button">
            Reset filters
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{report.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{report.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={exportCsv} type="button">
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" onClick={exportPayload} type="button">
              <FileJson className="size-4" aria-hidden="true" />
              Export payload
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {report.summary.map((item) => (
            <SummaryTile key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <div className="table-scroll mt-5 rounded-lg border border-slate-100">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                {report.columns.map((column) => (
                  <th key={column.key} className={cn("px-4 py-3 font-semibold", column.align === "right" ? "text-right" : "text-left")}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length ? report.rows.map((row, index) => (
                <tr key={`${report.title}-${index}`} className="bg-white">
                  {report.columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-4 text-slate-600", column.align === "right" ? "text-right font-medium text-slate-950" : "text-left")}>
                      {String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={report.columns.length}>
                    No rows match the current report filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
