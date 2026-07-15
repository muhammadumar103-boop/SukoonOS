# SukoonOS MVP Plan

Last updated: 2026-07-15

## Current Checkpoint

Sprint history has produced a working Next.js 15 app with:

- Demo mode when database and Supabase credentials are missing.
- Local expense tracker with browser persistence, edit/delete, search, filters, CSV export, dual PKR/USD values, and historical exchange rates.
- Finance page with local bank accounts, cash accounts, budgets, and account balances.
- Finance Ledger page combining local expenses with demo donations, transfers, refunds, fees, and adjustments.
- Prisma/Supabase production foundation that must remain intact but is not yet fully aligned with the MVP finance model.

## Conflicts And Duplication Found

- `README.md`, `PROJECT.md`, `FEATURES.md`, and `ROADMAP.md` still describe earlier foundation stages and understate the built UI/demo functionality.
- `DATABASE.md` and `prisma/schema.prisma` describe a basic Sprint 3 schema, but the MVP requires richer dual-currency financial transactions, ledger entries, donor CRM fields, project media/document placeholders, reminders, and approvals.
- Dashboard demo totals in `src/data/demo-data.ts` are hardcoded and not derived from transactions.
- `src/app/(app)/finance/finance-module.tsx` and `src/app/(app)/finance-ledger/finance-ledger.tsx` duplicate movement-building logic.
- Static demo donations and transfers are not yet part of a unified local repository, while expenses already use localStorage.
- API routes are read-only in demo mode, while the expense tracker writes directly to browser localStorage.
- Current roles are `ADMIN`, `STAFF`, and `VOLUNTEER`; the MVP target is `ADMIN`, `FINANCE`, `OPERATIONS`, and `VIEWER`.
- Expense category labels currently use `Salaries/Wages` and `Bank/Transfer Fees`; MVP labels require `Salaries and Wages` and `Bank and Transfer Fees`.

## Milestones

### Milestone 1: Architecture And Local Data Foundation

Status: Complete

Scope:

- Create `AGENTS.md`, `PLANS.md`, and `ARCHITECTURE.md`.
- Add shared MVP finance/domain types.
- Add a local workspace repository and migration layer.
- Preserve existing per-feature localStorage keys and migrate legacy records safely.
- Normalize expense category labels to MVP wording with aliases for older records.
- Add funding account support to local expenses with safe defaults.
- Do not rework visible pages except where needed to keep existing features compiling.

Acceptance criteria:

- Documentation exists and describes architecture, rules, milestones, conflicts, and acceptance criteria.
- Existing local expenses can normalize from old shapes without being lost.
- Local data layer can seed a demo workspace, create an empty workspace, and read migrated browser data.
- TypeScript passes.
- Production build passes.
- Local commit is created and the working tree is clean.

Verification:

- `npm run typecheck` passed on 2026-07-15.
- `npm run build` passed on 2026-07-15.
- Local route checks returned `200 OK` for `/`, `/projects`, `/donations`, `/donors`, `/expenses`, `/transfers`, `/finance`, `/finance-ledger`, `/reports`, `/settings`, and `/login`.

### Milestone 2: Finance Core

Status: Complete

Scope:

- Replace duplicate finance movement logic with one shared ledger service.
- Make Donations and Transfers create/edit/delete local records in demo mode.
- Make every donation, expense, transfer, refund, fee, and adjustment appear in the Finance Ledger.
- Make account balances derive from transactions only.
- Add account selection to expenses while preserving existing expense data and CSV export.
- Add safe sample-data controls: sample label, clear sample data, and empty workspace option.

Acceptance criteria:

- User can create donations and transfers locally.
- Ledger, balances, exports, and summaries use the same local transaction source.
- Transfers do not count as income or expense.
- Both USD and PKR display everywhere finance data appears.
- Existing expenses remain available after migration.

Verification:

- Shared ledger projection now powers the Finance page and Finance Ledger.
- Expenses, donations, and transfers all write to the local workspace in demo mode.
- Finance routes now show a demo-workspace banner with `Reload sample data` and `Clear sample data` controls.
- `npm run build` passed on 2026-07-15.
- `npm run typecheck` passed on 2026-07-15 after the generated `.next/types` files were refreshed by the build.

### Milestone 3: Projects And Budgets

Status: In progress

Checkpoint:

- Donor stabilization sprint completed on 2026-07-15 with local workspace export/import, backups, audit logging, dashboard quick action wiring, dead-interaction cleanup, and demo-mode donor CRUD.

Scope:

- Expand projects to MVP fields: type, location, dates, budgets in PKR/USD, beneficiaries, staff, timeline, media/document placeholders, donor updates, and completion report.
- Derive project donations, expenses, transfers, budget usage, and ledger activity from linked entries.
- Connect budgets to projects and categories with dual-currency reporting.

Acceptance criteria:

- Project totals derive from linked financial entries.
- Project pages show connected donations, expenses, transfers, budgets, and ledger rows.
- Project records persist after refresh in demo mode.

### Milestone 4: Donor CRM

Status: Not started

Scope:

- Expand donor records to MVP fields: contact details, preferences, zakat, recurring status, tax receipt, updates, reminders, and notes.
- Derive lifetime giving, last donation, and projects supported from donations.
- Add donor update reminders.

Acceptance criteria:

- Donor lifetime giving derives from donation records.
- Donor update reminders can be searched and filtered.
- Donor records persist after refresh in demo mode.

### Milestone 5: Tasks, Approvals, Dashboard, Reports

Status: Not started

Scope:

- Add tasks and approval queues for expenses, transfers, project updates, and donor reminders.
- Replace dashboard hardcoded data with derived local repository calculations.
- Build reports with search, date filters, project filters, currency display, and CSV export.
- Add PDF-ready report payload architecture without adding fragile PDF dependencies.

Acceptance criteria:

- Dashboard values derive from stored data.
- Pending approvals and upcoming tasks derive from tasks/approval records.
- Reports cover the requested MVP report types and export CSV.

### Milestone 6: End-To-End Validation

Status: Not started

Scope:

- Test every route without credentials.
- Run TypeScript and production build.
- Review responsive behavior and accessibility basics.
- Update documentation and final demo seed.

Acceptance criteria:

- All pages load without credentials.
- Refreshing preserves local records.
- No secrets are committed.
- Git working tree is clean after the committed milestone.

## Overall MVP Acceptance Criteria

- All pages load without credentials.
- Existing expenses remain available after migration.
- A user can create, edit, delete, search, filter, and export expenses.
- A user can create donations and transfers.
- Every transaction appears in the Finance Ledger.
- Both USD and PKR values display correctly.
- Historical exchange rates remain unchanged.
- Account balances derive from transactions.
- Project totals derive from linked financial entries.
- Donor lifetime giving derives from donations.
- Dashboard values derive from stored data.
- Refreshing the browser preserves local records.
- CSV exports work.
- TypeScript passes.
- Production build passes.
- No environment secrets are committed.
- Git working tree is clean after each committed milestone.
