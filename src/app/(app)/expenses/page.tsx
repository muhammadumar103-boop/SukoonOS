import { PageHeader } from "@/components/data-display/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { getExpenses } from "@/server/queries/expenses";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Review charity spending, vendor invoices, categories, and approval status before funds move."
        action={<button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white">Submit expense</button>}
      />
      <section className="rounded-lg border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-5 py-4 font-medium text-slate-950">{expense.vendor}</td>
                  <td className="px-5 py-4 text-slate-500">{expense.category}</td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{expense.amount}</td>
                  <td className="px-5 py-4 text-slate-500">{expense.project}</td>
                  <td className="px-5 py-4"><StatusBadge value={expense.status} /></td>
                </tr>
              ))}
              {!expenses.length ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={5}>
                    No expenses have been submitted yet.
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
