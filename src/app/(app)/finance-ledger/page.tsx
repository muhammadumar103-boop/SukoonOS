import { PageHeader } from "@/components/data-display/page-header";
import { LocalWorkspaceBanner } from "@/components/data-display/local-workspace-banner";
import { isDemoMode } from "@/config/runtime";
import { FinanceLedger } from "@/app/(app)/finance-ledger/finance-ledger";

export default function FinanceLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Ledger"
        description="Search donations, expenses, transfers, refunds, fees, and other financial movements in one chronological view."
      />
      {isDemoMode ? <LocalWorkspaceBanner /> : null}
      <FinanceLedger />
    </div>
  );
}
