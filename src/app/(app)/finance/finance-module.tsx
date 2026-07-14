"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CircleDollarSign,
  Landmark,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { demoDonationsPageData, demoTransfers } from "@/data/demo-data";
import {
  convertedExpenseAmounts,
  defaultFinanceAccounts,
  defaultFinanceBudgets,
  defaultUsdToPkrRate,
  expenseCategories,
  formatMoney,
  localExpenseStorageKey,
  localFinanceAccountsStorageKey,
  localFinanceBudgetsStorageKey,
  normalizeFinanceAccount,
  normalizeFinanceBudget,
  normalizeLocalExpense,
  parseMoney,
  sukoonProjects,
  type AccountKind,
  type Currency,
  type FinanceAccount,
  type FinanceBudget,
  type LocalExpense,
} from "@/lib/finance/local-finance";
import { cn } from "@/lib/utils";

type AccountMovement = {
  id: string;
  date: string;
  type: "Donation" | "Expense" | "Transfer";
  accountId: string;
  description: string;
  project: string;
  party: string;
  amount: number;
  currency: Currency;
  status: string;
};

type AccountFormState = {
  name: string;
  kind: AccountKind;
  currency: Currency;
  institution: string;
  purpose: string;
  openingBalance: string;
};

type BudgetFormState = {
  name: string;
  project: string;
  category: string;
  period: FinanceBudget["period"];
  currency: Currency;
  amount: string;
  owner: string;
};

const emptyAccountForm: AccountFormState = {
  name: "",
  kind: "Bank",
  currency: "PKR",
  institution: "",
  purpose: "",
  openingBalance: "",
};

const emptyBudgetForm: BudgetFormState = {
  name: "",
  project: sukoonProjects[0],
  category: expenseCategories[0],
  period: "Monthly",
  currency: "PKR",
  amount: "",
  owner: "",
};

function isoDateFromDemoDate(value: string, fallbackOffset: number) {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return new Date(Date.now() - fallbackOffset * 86400000).toISOString().slice(0, 10);
}

function accountForExpense(expense: LocalExpense) {
  if (expense.paymentMethod === "Cash") {
    return expense.originalCurrency === "PKR" ? "field-cash-pkr" : "petty-cash-usd";
  }

  return expense.originalCurrency === "PKR" ? "operations-bank-pkr" : "main-donations-bank";
}

function demoTransferMovements(): AccountMovement[] {
  const completedTransfers = demoTransfers.filter((transfer) => transfer.status === "Completed" || transfer.status === "Scheduled");

  return completedTransfers.flatMap((transfer, index) => {
    const amount = parseMoney(transfer.amount);
    const date = isoDateFromDemoDate(transfer.date, index + 4);
    const toFieldCash = transfer.to === "Field Operations";
    const destinationAccountId = toFieldCash ? "field-cash-pkr" : "operations-bank-pkr";
    const destinationAmount = toFieldCash ? amount * defaultUsdToPkrRate : amount * defaultUsdToPkrRate;

    return [
      {
        id: `transfer-${transfer.id}-out`,
        date,
        type: "Transfer" as const,
        accountId: "main-donations-bank",
        description: `${transfer.from} to ${transfer.to}`,
        project: transfer.to,
        party: transfer.from,
        amount: -amount,
        currency: "USD" as const,
        status: transfer.status,
      },
      {
        id: `transfer-${transfer.id}-in`,
        date,
        type: "Transfer" as const,
        accountId: destinationAccountId,
        description: `${transfer.from} to ${transfer.to}`,
        project: transfer.to,
        party: transfer.from,
        amount: destinationAmount,
        currency: "PKR" as const,
        status: transfer.status,
      },
    ];
  });
}

function buildMovements(expenses: LocalExpense[]): AccountMovement[] {
  const donationMovements: AccountMovement[] = demoDonationsPageData.donations.map((donation, index) => {
    const amount = parseMoney(donation.amount);

    return {
      id: `donation-${donation.id}`,
      date: isoDateFromDemoDate(donation.date, index),
      type: "Donation",
      accountId: "main-donations-bank",
      description: `Donation from ${donation.donor}`,
      project: donation.fund,
      party: donation.donor,
      amount,
      currency: "USD",
      status: donation.status,
    };
  });

  const expenseMovements = expenses
    .filter((expense) => expense.approvalStatus !== "Rejected" && expense.approvalStatus !== "Draft")
    .map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.date,
      type: "Expense" as const,
      accountId: accountForExpense(expense),
      description: expense.description || expense.category,
      project: expense.project,
      party: expense.paidBy || "Not set",
      amount: -Math.abs(expense.originalAmount),
      currency: expense.originalCurrency,
      status: expense.approvalStatus,
    }));

  return [...donationMovements, ...expenseMovements, ...demoTransferMovements()].sort((a, b) => b.date.localeCompare(a.date));
}

export function FinanceModule() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>(defaultFinanceAccounts);
  const [budgets, setBudgets] = useState<FinanceBudget[]>(defaultFinanceBudgets);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [budgetSearch, setBudgetSearch] = useState("");
  const [accountForm, setAccountForm] = useState<AccountFormState>(emptyAccountForm);
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(emptyBudgetForm);

  useEffect(() => {
    const savedAccounts = window.localStorage.getItem(localFinanceAccountsStorageKey);
    const savedBudgets = window.localStorage.getItem(localFinanceBudgetsStorageKey);
    const savedExpenses = window.localStorage.getItem(localExpenseStorageKey);

    if (savedAccounts) {
      try {
        setAccounts((JSON.parse(savedAccounts) as FinanceAccount[]).map(normalizeFinanceAccount));
      } catch {
        setAccounts(defaultFinanceAccounts);
      }
    }

    if (savedBudgets) {
      try {
        setBudgets((JSON.parse(savedBudgets) as FinanceBudget[]).map(normalizeFinanceBudget));
      } catch {
        setBudgets(defaultFinanceBudgets);
      }
    }

    if (savedExpenses) {
      try {
        setExpenses((JSON.parse(savedExpenses) as LocalExpense[]).map(normalizeLocalExpense));
      } catch {
        setExpenses([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(localFinanceAccountsStorageKey, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    window.localStorage.setItem(localFinanceBudgetsStorageKey, JSON.stringify(budgets));
  }, [budgets]);

  const movements = useMemo(() => buildMovements(expenses), [expenses]);

  const accountRows = useMemo(() => {
    return accounts.map((account) => {
      const accountMovements = movements.filter((movement) => movement.accountId === account.id && movement.currency === account.currency);
      const movementTotal = accountMovements.reduce((sum, movement) => sum + movement.amount, 0);
      const balance = account.openingBalance + movementTotal;

      return {
        ...account,
        movementTotal,
        balance,
        movementCount: accountMovements.length,
      };
    });
  }, [accounts, movements]);

  const filteredAccounts = useMemo(() => {
    const query = accountSearch.trim().toLowerCase();

    return accountRows.filter((account) =>
      [account.name, account.kind, account.currency, account.institution, account.purpose, account.status].join(" ").toLowerCase().includes(query),
    );
  }, [accountRows, accountSearch]);

  const budgetRows = useMemo(() => {
    return budgets.map((budget) => {
      const spentNative = expenses
        .filter((expense) => expense.project === budget.project && expense.category === budget.category && expense.approvalStatus !== "Rejected")
        .reduce((sum, expense) => {
          const amounts = convertedExpenseAmounts(expense);
          return sum + (budget.currency === "PKR" ? amounts.pkr : amounts.usd);
        }, 0);
      const remaining = budget.amount - spentNative;
      const usedPercent = budget.amount > 0 ? Math.min(100, Math.round((spentNative / budget.amount) * 100)) : 0;

      return {
        ...budget,
        spent: spentNative,
        remaining,
        usedPercent,
        status: remaining < 0 ? "At Risk" : usedPercent >= 80 ? "Review" : "Active",
      };
    });
  }, [budgets, expenses]);

  const filteredBudgets = useMemo(() => {
    const query = budgetSearch.trim().toLowerCase();

    return budgetRows.filter((budget) =>
      [budget.name, budget.project, budget.category, budget.period, budget.currency, budget.owner, budget.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [budgetRows, budgetSearch]);

  const summary = useMemo(() => {
    return accountRows.reduce(
      (result, account) => {
        result[account.currency] += account.balance;
        if (account.kind === "Bank") {
          result.bankAccounts += 1;
        } else {
          result.cashAccounts += 1;
        }
        return result;
      },
      { PKR: 0, USD: 0, bankAccounts: 0, cashAccounts: 0 },
    );
  }, [accountRows]);

  const movementTotals = useMemo(() => {
    return movements.reduce(
      (result, movement) => {
        result[movement.currency] += movement.amount;
        return result;
      },
      { PKR: 0, USD: 0 },
    );
  }, [movements]);

  function handleAddAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = accountForm.name.trim();
    if (!name) {
      return;
    }

    setAccounts((current) => [
      ...current,
      normalizeFinanceAccount({
        id: `account-${Date.now()}`,
        name,
        kind: accountForm.kind,
        currency: accountForm.currency,
        institution: accountForm.institution.trim(),
        purpose: accountForm.purpose.trim(),
        openingBalance: Number(accountForm.openingBalance || 0),
        status: "Active",
      }),
    ]);
    setAccountForm(emptyAccountForm);
  }

  function handleAddBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = budgetForm.name.trim();
    if (!name) {
      return;
    }

    setBudgets((current) => [
      ...current,
      normalizeFinanceBudget({
        id: `budget-${Date.now()}`,
        name,
        project: budgetForm.project,
        category: budgetForm.category,
        period: budgetForm.period,
        currency: budgetForm.currency,
        amount: Number(budgetForm.amount || 0),
        owner: budgetForm.owner.trim(),
      }),
    ]);
    setBudgetForm(emptyBudgetForm);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Landmark} label="Bank balance" value={`${formatMoney(summary.PKR, "PKR")} / ${formatMoney(summary.USD, "USD")}`} />
        <SummaryCard icon={WalletCards} label="Bank accounts" value={String(summary.bankAccounts)} detail="Automatic balances enabled" />
        <SummaryCard icon={Banknote} label="Cash accounts" value={String(summary.cashAccounts)} detail="Field and petty cash tracked" />
        <SummaryCard
          icon={CircleDollarSign}
          label="Net movements"
          value={`${formatMoney(movementTotals.PKR, "PKR")} / ${formatMoney(movementTotals.USD, "USD")}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
          <div className="flex flex-col gap-3 border-b border-emerald-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Bank and cash balances update from donations, expenses, and transfers.</p>
            </div>
            <SearchField value={accountSearch} onChange={setAccountSearch} placeholder="Search accounts..." />
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <AccountGroup title="Bank Accounts" accounts={filteredAccounts.filter((account) => account.kind === "Bank")} onDelete={setAccounts} />
            <AccountGroup title="Cash Accounts" accounts={filteredAccounts.filter((account) => account.kind === "Cash")} onDelete={setAccounts} />
          </div>
        </div>

        <form className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5" onSubmit={handleAddAccount}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Plus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add Account</h2>
              <p className="text-sm text-slate-500">Stored locally in demo mode.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <input className={inputClass} placeholder="Account name" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className={inputClass} value={accountForm.kind} onChange={(event) => setAccountForm({ ...accountForm, kind: event.target.value as AccountKind })}>
                <option value="Bank">Bank account</option>
                <option value="Cash">Cash account</option>
              </select>
              <select className={inputClass} value={accountForm.currency} onChange={(event) => setAccountForm({ ...accountForm, currency: event.target.value as Currency })}>
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input
              className={inputClass}
              placeholder="Bank, branch, or location"
              value={accountForm.institution}
              onChange={(event) => setAccountForm({ ...accountForm, institution: event.target.value })}
            />
            <input className={inputClass} placeholder="Opening balance" type="number" value={accountForm.openingBalance} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })} />
            <textarea
              className={cn(inputClass, "min-h-20 py-2")}
              placeholder="Purpose"
              value={accountForm.purpose}
              onChange={(event) => setAccountForm({ ...accountForm, purpose: event.target.value })}
            />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800" type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Add account
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
          <div className="flex flex-col gap-3 border-b border-emerald-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Budgets</h2>
              <p className="mt-1 text-sm text-slate-500">Every budget compares against approved local expenses by project and category.</p>
            </div>
            <SearchField value={budgetSearch} onChange={setBudgetSearch} placeholder="Search budgets..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Budget</th>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 text-right font-semibold">Budget</th>
                  <th className="px-5 py-3 text-right font-semibold">Spent</th>
                  <th className="px-5 py-3 text-right font-semibold">Remaining</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBudgets.map((budget) => (
                  <tr key={budget.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{budget.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{budget.owner || "No owner assigned"}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{budget.project}</td>
                    <td className="px-5 py-4 text-slate-500">{budget.category}</td>
                    <td className="px-5 py-4 text-slate-500">{budget.period}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-950">{formatMoney(budget.amount, budget.currency)}</td>
                    <td className="px-5 py-4 text-right text-slate-500">{formatMoney(budget.spent, budget.currency)}</td>
                    <td className={cn("px-5 py-4 text-right font-semibold", budget.remaining < 0 ? "text-red-700" : "text-emerald-700")}>
                      {formatMoney(budget.remaining, budget.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <StatusBadge value={budget.status} />
                        <div className="h-1.5 w-24 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${budget.usedPercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                        onClick={() => setBudgets((current) => current.filter((item) => item.id !== budget.id))}
                        type="button"
                        aria-label={`Delete ${budget.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredBudgets.length ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                      No budgets match the current search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5" onSubmit={handleAddBudget}>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add Budget</h2>
          <p className="mt-1 text-sm text-slate-500">Budgets stay separate from projects and expense categories.</p>
          <div className="mt-5 grid gap-3">
            <input className={inputClass} placeholder="Budget name" value={budgetForm.name} onChange={(event) => setBudgetForm({ ...budgetForm, name: event.target.value })} />
            <select className={inputClass} value={budgetForm.project} onChange={(event) => setBudgetForm({ ...budgetForm, project: event.target.value })}>
              {sukoonProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <select className={inputClass} value={budgetForm.category} onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })}>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className={inputClass} value={budgetForm.period} onChange={(event) => setBudgetForm({ ...budgetForm, period: event.target.value as FinanceBudget["period"] })}>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
              <select className={inputClass} value={budgetForm.currency} onChange={(event) => setBudgetForm({ ...budgetForm, currency: event.target.value as Currency })}>
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input className={inputClass} placeholder="Budget amount" type="number" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} />
            <input className={inputClass} placeholder="Owner" value={budgetForm.owner} onChange={(event) => setBudgetForm({ ...budgetForm, owner: event.target.value })} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800" type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Add budget
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col gap-3 border-b border-emerald-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Finance Ledger Integration</h2>
            <p className="mt-1 text-sm text-slate-500">Latest account-impacting donations, expenses, and transfers.</p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" href="/finance-ledger">
            Open full ledger
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {movements.slice(0, 8).map((movement) => (
            <MovementRow key={movement.id} movement={movement} account={accounts.find((account) => account.id === movement.accountId)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountGroup({
  title,
  accounts,
  onDelete,
}: {
  title: string;
  accounts: Array<FinanceAccount & { movementTotal: number; balance: number; movementCount: number }>;
  onDelete: React.Dispatch<React.SetStateAction<FinanceAccount[]>>;
}) {
  const Icon = title.startsWith("Bank") ? Building2 : Banknote;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <Icon className="size-4 text-emerald-700" aria-hidden="true" />
        {title}
      </div>
      {accounts.map((account) => (
        <article key={account.id} className="rounded-lg border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">{account.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{account.institution || "No institution set"}</p>
            </div>
            <StatusBadge value={account.status} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{account.purpose || "No purpose set."}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AccountMetric label="Opening" value={formatMoney(account.openingBalance, account.currency)} />
            <AccountMetric label="Movements" value={formatMoney(account.movementTotal, account.currency)} tone={account.movementTotal < 0 ? "negative" : "positive"} />
            <AccountMetric label="Balance" value={formatMoney(account.balance, account.currency)} tone={account.balance < 0 ? "negative" : "positive"} />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>{account.movementCount} linked movements</span>
            <button
              className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              onClick={() => onDelete((current) => current.filter((item) => item.id !== account.id))}
              type="button"
              aria-label={`Delete ${account.name}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
      {!accounts.length ? <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No accounts match this view.</p> : null}
    </div>
  );
}

function MovementRow({ movement, account }: { movement: AccountMovement; account?: FinanceAccount }) {
  const Icon = movement.type === "Donation" ? ArrowDownLeft : movement.type === "Expense" ? ArrowUpRight : ArrowRightLeft;

  return (
    <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", movement.amount < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-slate-950">{movement.description}</p>
          <p className="mt-1 text-sm text-slate-500">
            {movement.date} · {movement.project} · {account?.name ?? "Unassigned account"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <StatusBadge value={movement.status} />
        <p className={cn("min-w-32 text-right font-semibold", movement.amount < 0 ? "text-red-700" : "text-emerald-700")}>
          {formatMoney(movement.amount, movement.currency)}
        </p>
      </div>
    </div>
  );
}

function AccountMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-950")}>{value}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof Landmark; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-md border border-emerald-100 px-3 sm:w-72">
      <Search className="size-4 text-slate-400" aria-hidden="true" />
      <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-emerald-100 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";
