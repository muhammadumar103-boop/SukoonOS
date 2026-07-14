# SukoonOS Engineering Rules

These rules are permanent working instructions for SukoonOS contributors and coding agents.

## Product Guardrails

- SukoonOS is the operating system for Sukoon Charity. Build calm, reliable operational software for charity teams.
- Do not rebuild the project from scratch. Preserve the existing Next.js app, UI, demo mode, local expense tracker, Finance Ledger, Git history, and working behavior.
- Do not delete user-entered local data. Any data shape change must include a backward-compatible migration.
- Do not push automatically. Commit locally after each successful milestone only when requested.
- Stop and ask before deleting user data, making destructive Prisma schema changes, requiring paid services, adding secrets, or making irreversible architecture decisions.

## Architecture Rules

- Keep demo mode fully usable without `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never initialize Prisma or Supabase in demo mode.
- Keep Supabase and Prisma integration available for future production mode.
- Use a repository/service boundary so pages do not duplicate financial calculations.
- Do not use hardcoded dashboard or report totals. Derive totals from the same transaction source used by the ledger.
- Keep transactions immutable enough for finance: original amount, original currency, historical exchange rate, PKR value, and USD value must be stored or derived from the transaction's own saved rate.
- Transfers between accounts affect balances but must not count as income or expenses.
- Donations count as income. Expenses count as spending. Refunds, fees, and adjustments must be explicitly typed.
- Do not add fragile PDF dependencies unless already supported by the runtime. Build PDF-ready report data structures first.

## Code Rules

- Use TypeScript types and validation at every boundary.
- Prefer shared finance/domain helpers over page-local calculations.
- Prefer small, reversible migrations over broad rewrites.
- Keep client-only localStorage code out of server components.
- Preserve server/client boundaries. Server routes enforce auth and roles in production mode.
- Avoid duplicate financial data entry. A transaction should create ledger activity; ledger rows should not be independently entered copies.
- Keep CSV export working for expenses and future reports.
- Run `npm run typecheck` and `npm run build` after each milestone.
- Test every route after UI-affecting milestones.

## Roles

The target role model is:

- `ADMIN`: full access, settings, destructive actions.
- `FINANCE`: finance records, approvals, reports, account reconciliation.
- `OPERATIONS`: projects, tasks, donor updates, operational expense submission.
- `VIEWER`: read-only access.

The current production schema still has `ADMIN`, `STAFF`, and `VOLUNTEER`. Role migration must be planned and non-destructive.

## Documentation Rules

- Keep `PLANS.md` current with milestone checkpoints.
- Keep `ARCHITECTURE.md` current when modules, entities, data flow, security, or production migration strategy changes.
- Update `README.md`, `PROJECT.md`, `FEATURES.md`, `ROADMAP.md`, and `DATABASE.md` when their claims no longer match the code.
