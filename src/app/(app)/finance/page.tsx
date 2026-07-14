import { PageHeader } from "@/components/data-display/page-header";
import { FinanceModule } from "@/app/(app)/finance/finance-module";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Manage charity bank accounts, cash accounts, budgets, and automatic balances from every financial movement."
      />
      <FinanceModule />
    </div>
  );
}
