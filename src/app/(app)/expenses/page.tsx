import { PageHeader } from "@/components/data-display/page-header";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { isDemoMode } from "@/config/runtime";
import { getExpenses } from "@/server/queries/expenses";
import { LocalExpenseTracker } from "@/app/(app)/expenses/local-expense-tracker";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track local spending immediately in demo mode, with browser persistence, filters, totals, edits, and CSV export."
      />
      {isDemoMode ? <LocalWorkspaceBanner /> : null}
      <LocalExpenseTracker initialExpenses={expenses} />
    </div>
  );
}
