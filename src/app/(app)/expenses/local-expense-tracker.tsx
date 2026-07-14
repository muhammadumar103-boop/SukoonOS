"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Search, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";

type Currency = "PKR" | "USD";
type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Paid" | "Rejected";

type LocalExpense = {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  project: string;
  description: string;
  paymentMethod: string;
  paidBy: string;
  receiptReference: string;
  approvalStatus: ApprovalStatus;
  notes: string;
};

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

const storageKey = "sukoonos.local.expenses.v1";

const categories = ["Food Relief", "Medical Aid", "Education", "Transport", "Operations", "Emergency", "Utilities"];
const projects = ["Winter Relief 2026", "Mobile Medical Camp", "Orphan Education Fund", "Food Parcel Program", "General Operations"];
const paymentMethods = ["Cash", "Bank Transfer", "Card", "Cheque", "Mobile Wallet"];
const statuses: ApprovalStatus[] = ["Draft", "Pending", "Approved", "Paid", "Rejected"];

const demoExpenses: LocalExpense[] = [
  {
    id: "local-expense-1",
    date: "2026-07-11",
    amount: 415000,
    currency: "PKR",
    category: "Medical Aid",
    project: "Mobile Medical Camp",
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
    amount: 9450,
    currency: "USD",
    category: "Education",
    project: "Orphan Education Fund",
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
    amount: 680000,
    currency: "PKR",
    category: "Food Relief",
    project: "Food Parcel Program",
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
  amount: 0,
  currency: "PKR",
  category: categories[0],
  project: projects[0],
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
    amount: parseCurrencyAmount(expense.amount),
    currency: expense.amount.includes("$") ? "USD" : "PKR",
    category: expense.category,
    project: expense.project,
    description: expense.vendor,
    paymentMethod: "Bank Transfer",
    paidBy: "Operations Team",
    receiptReference: `EXP-${String(index + 1).padStart(4, "0")}`,
    approvalStatus: statuses.includes(expense.status as ApprovalStatus) ? (expense.status as ApprovalStatus) : "Pending",
    notes: "Imported from SukoonOS demo data.",
  };
}

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
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

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        setExpenses(JSON.parse(saved) as LocalExpense[]);
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setExpenses(initialExpenses.length ? initialExpenses.map(normalizeInitialExpense) : demoExpenses);
  }, [initialExpenses]);

  useEffect(() => {
    if (expenses.length) {
      window.localStorage.setItem(storageKey, JSON.stringify(expenses));
    }
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const searchable = [
        expense.date,
        expense.category,
        expense.project,
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
        (currencyFilter === "All" || expense.currency === currencyFilter) &&
        (statusFilter === "All" || expense.approvalStatus === statusFilter) &&
        (categoryFilter === "All" || expense.category === categoryFilter) &&
        (projectFilter === "All" || expense.project === projectFilter)
      );
    });
  }, [categoryFilter, currencyFilter, expenses, projectFilter, search, statusFilter]);

  const totals = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return expenses.reduce(
      (result, expense) => {
        result[expense.currency] += expense.amount;

        if (expense.date.startsWith(currentMonth)) {
          result.month[expense.currency] += expense.amount;
        }

        return result;
      },
      { PKR: 0, USD: 0, month: { PKR: 0, USD: 0 } },
    );
  }, [expenses]);

  function updateForm<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextExpense: LocalExpense = {
      id: editingId ?? createId(),
      ...form,
      amount: Number(form.amount),
    };

    setExpenses((current) => {
      if (editingId) {
        return current.map((expense) => (expense.id === editingId ? nextExpense : expense));
      }

      return [nextExpense, ...current];
    });

    resetForm();
  }

  function editExpense(expense: LocalExpense) {
    setForm({
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      project: expense.project,
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
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Amount",
      "Currency",
      "Category",
      "Project",
      "Description",
      "Payment Method",
      "Paid By",
      "Receipt Reference",
      "Approval Status",
      "Notes",
    ];
    const rows = filteredExpenses.map((expense) => [
      expense.date,
      expense.amount,
      expense.currency,
      expense.category,
      expense.project,
      expense.description,
      expense.paymentMethod,
      expense.paidBy,
      expense.receiptReference,
      expense.approvalStatus,
      expense.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sukoonos-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="PKR total" value={formatMoney(totals.PKR, "PKR")} />
        <SummaryCard label="USD total" value={formatMoney(totals.USD, "USD")} />
        <SummaryCard label="This month PKR" value={formatMoney(totals.month.PKR, "PKR")} />
        <SummaryCard label="This month USD" value={formatMoney(totals.month.USD, "USD")} />
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit expense" : "Add expense"}</h2>
          <p className="text-sm text-slate-500">Saved locally in this browser for immediate demo use.</p>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <Field label="Date">
            <input className={inputClass} onChange={(event) => updateForm("date", event.target.value)} required type="date" value={form.date} />
          </Field>
          <Field label="Amount">
            <input
              className={inputClass}
              min="0"
              onChange={(event) => updateForm("amount", Number(event.target.value))}
              required
              step="0.01"
              type="number"
              value={form.amount}
            />
          </Field>
          <Field label="Currency">
            <select className={inputClass} onChange={(event) => updateForm("currency", event.target.value as Currency)} value={form.currency}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Approval status">
            <select className={inputClass} onChange={(event) => updateForm("approvalStatus", event.target.value as ApprovalStatus)} value={form.approvalStatus}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} onChange={(event) => updateForm("category", event.target.value)} value={form.category}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select className={inputClass} onChange={(event) => updateForm("project", event.target.value)} value={form.project}>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select className={inputClass} onChange={(event) => updateForm("paymentMethod", event.target.value)} value={form.paymentMethod}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
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
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800">
              {editingId ? "Save changes" : "Add expense"}
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
            <option value="All">All currencies</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value as "All" | ApprovalStatus)} value={statusFilter}>
            <option value="All">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="All">All categories</option>
            {categories.map((category) => (
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
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <p className="self-center text-sm text-slate-500 lg:col-span-3">
            Showing {filteredExpenses.length} of {expenses.length} local expenses
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Paid by</th>
                <th className="px-5 py-3 font-semibold">Receipt</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="align-top">
                  <td className="px-5 py-4 text-slate-500">{expense.date}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-950">{expense.description}</p>
                    <p className="mt-1 line-clamp-2 max-w-xs text-xs leading-5 text-slate-500">{expense.notes || expense.paymentMethod}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{expense.category}</td>
                  <td className="px-5 py-4 text-slate-500">{expense.project}</td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{formatMoney(expense.amount, expense.currency)}</td>
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
              ))}
              {!filteredExpenses.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
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
