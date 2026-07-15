"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Search, Trash2 } from "lucide-react";
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
  type LocalExpense,
} from "@/lib/finance/local-finance";
import { expenseImpactsBalances, validateExchangeRateInput, validatePositiveMoneyInput } from "@/lib/local-data/finance-rules";
import { activeProjectOptions, projectLabel } from "@/lib/local-data/projects";
import { loadLocalWorkspace, saveAuditedWorkspace, saveLocalWorkspace } from "@/lib/local-data/repository";
import type { LocalProject } from "@/lib/local-data/schema";
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
    approvalStatus: "Pending",
    notes: "Awaiting program lead confirmation.",
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
    approvalStatus: "Approved",
    notes: "Matched to July education budget.",
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
    approvalStatus: "Paid",
    notes: "Vendor payment completed.",
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
  approvalStatus: "Pending",
  notes: "",
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
    approvalStatus: approvalStatuses.includes(expense.status as ApprovalStatus) ? (expense.status as ApprovalStatus) : "Pending",
    notes: "Imported from SukoonOS demo data.",
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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const workspaceRef = useRef<ReturnType<typeof loadLocalWorkspace> | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    const localWorkspace = loadLocalWorkspace();
    workspaceRef.current = localWorkspace;
    setAccounts(localWorkspace.financeAccounts);
    setProjects(localWorkspace.projects);
    const defaultProject = activeProjectOptions(localWorkspace.projects)[0];
    setForm((current) => ({
      ...current,
      projectId: defaultProject?.id ?? current.projectId,
      project: defaultProject?.name ?? current.project,
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
        expense.approvalStatus,
        expense.notes,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (currencyFilter === "All" || expense.originalCurrency === currencyFilter) &&
        (statusFilter === "All" || expense.approvalStatus === statusFilter) &&
        (categoryFilter === "All" || expense.category === categoryFilter) &&
        (projectFilter === "All" || displayProject === projectFilter)
      );
    });
  }, [categoryFilter, currencyFilter, expenses, projectFilter, projects, search, statusFilter]);

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

  function persistExpenses(
    nextExpenses: LocalExpense[],
    audit?: { action: string; entityId: string; metadata: Record<string, unknown> },
  ) {
    if (!workspaceRef.current) {
      return;
    }

    window.localStorage.setItem(localExpenseStorageKey, JSON.stringify(nextExpenses));
    const nextWorkspace = { ...workspaceRef.current, expenses: nextExpenses };
    const savedWorkspace = audit
      ? saveAuditedWorkspace(nextWorkspace, {
          entityType: "expense",
          actor: "Local Demo User",
          entityId: audit.entityId,
          action: audit.action,
          metadata: audit.metadata,
        })
      : saveLocalWorkspace(nextWorkspace);

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
      fundingAccountId: defaultFundingAccountId(current.paymentMethod, currency),
    }));
  }

  function updatePaymentMethod(paymentMethod: string) {
    setForm((current) => ({
      ...current,
      paymentMethod,
      fundingAccountId: defaultFundingAccountId(paymentMethod, current.originalCurrency),
    }));
  }

  function resetForm() {
    const firstProject = activeProjectOptions(projects)[0];
    setForm({
      ...emptyForm,
      projectId: firstProject?.id ?? "",
      project: firstProject?.name ?? "General Operations",
    });
    setEditingId(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedProject = projects.find((project) => project.id === form.projectId);
    if (!selectedProject) {
      setNotice({ tone: "error", message: "Select a project before saving an expense." });
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

    const nextExpense: LocalExpense = {
      id: editingId ?? createId(),
      ...form,
      project: selectedProject.name,
      originalAmount: Number(form.originalAmount),
      exchangeRate: Number(form.exchangeRate),
    };

    const nextExpenses = editingId
      ? expenses.map((expense) => (expense.id === editingId ? nextExpense : expense))
      : [nextExpense, ...expenses];
    persistExpenses(nextExpenses, {
      action: editingId ? "updated" : "created",
      entityId: nextExpense.id,
      metadata: {
        accountId: nextExpense.fundingAccountId,
        projectId: nextExpense.projectId,
        status: nextExpense.approvalStatus,
      },
    });
    setNotice({
      tone: "success",
      message: editingId ? "Expense updated in the local workspace." : "Expense saved to the local workspace.",
    });

    resetForm();
  }

  function editExpense(expense: LocalExpense) {
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
      approvalStatus: expense.approvalStatus,
      notes: expense.notes,
    });
    setEditingId(expense.id);
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
      {
        action: "voided",
        entityId: expense.id,
        metadata: { previousStatus: expense.approvalStatus, projectId: expense.projectId },
      },
    );
    setNotice({ tone: "success", message: "Expense was voided and kept in the local audit trail." });
    if (editingId === id) {
      resetForm();
    }
  }

  function exportCsv() {
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
        expense.approvalStatus,
        expense.notes,
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sukoonos-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const availableProjects = activeProjectOptions(projects);
  const projectNames = Array.from(new Set(expenses.map((expense) => projectLabel(projects, expense)))).sort();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="PKR total (all expenses)" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="USD total (all expenses)" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="This month PKR value" value={formatMoney(totals.month.PKR, "PKR")} />
        <SummaryCard label="This month USD value" value={formatMoney(totals.month.USD, "USD")} />
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
            <select className={inputClass} onChange={(event) => updateForm("fundingAccountId", event.target.value)} value={form.fundingAccountId}>
              {accounts
                .filter((account) => account.currency === form.originalCurrency)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
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
          <Field className="lg:col-span-4" label="Notes">
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Approval notes, vendor context, or reconciliation details"
              value={form.notes}
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none" disabled={!availableProjects.length}>
              {!availableProjects.length ? "Create project first" : editingId ? "Save changes" : "Add expense"}
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
          <p className="self-center text-sm text-slate-500 lg:col-span-3">
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
                  <td className="px-5 py-4 text-slate-500">{expense.receiptReference || "None"}</td>
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
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={11}>
                    No expenses match the current filters.
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
