# SukoonOS Daily Operations

Use this checklist when Sukoon Charity is running SukoonOS locally in demo mode.

## Before You Start

- Local records live only in the current browser profile.
- Workspace JSON exports do not include receipt or proof binaries.
- Expense proofs should be backed up separately from the workspace JSON.

## Suggested Order Of Work

1. Check the workspace banner.
   - Confirm whether you are in the sample workspace or an empty local workspace.
   - Export the current workspace before major cleanup or imports.

2. Create finance accounts.
   - Add bank and cash accounts from the Finance page before recording live donations, expenses, or transfers.

3. Create donors.
   - Add donor contact details in Donors CRM before recording new donations.

4. Create projects.
   - Add project records before linking donations, expenses, transfers, budgets, or reminders.

5. Record donations.
   - Use the Donations page.
   - Select the donor, project, account, original currency, original amount, and historical exchange rate.

6. Record expenses.
   - Use the Expenses page.
   - Select the expense category, linked project, funding account, and historical exchange rate.
   - Add proof files whenever possible.
   - Export expense proofs regularly.

7. Record transfers.
   - Use the Transfers page for movement between accounts.
   - Transfers should never be used for income or spending.

8. Review the Finance Ledger and dashboard.
   - Confirm balances, recent activity, approvals, and reminders.

9. Export backups at the end of the day.
   - Export workspace JSON.
   - Export expense proofs if receipts, invoices, or bank proof files changed.

## Import And Recovery

- Importing a workspace creates a browser backup first.
- Clearing sample data or reloading sample data also creates a browser backup first.
- If proof files are missing after a workspace import, import the expense proof backup separately.

## Troubleshooting

- If development starts failing with missing chunk files or `_document` errors, restart with:

```bash
npm run dev:clean
```

- If a page looks correct but data seems stale, reload the route after confirming the current workspace mode from the banner.
