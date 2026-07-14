# SukoonOS Roadmap

This roadmap is intentionally high-level until product discovery is complete.

## Phase 0: Foundation

Status: Complete

- Initialize Next.js 15 project foundation.
- Configure TypeScript, Tailwind CSS, and shadcn/ui.
- Add Supabase client structure.
- Add Prisma datasource structure.
- Create project documentation.
- Add demo mode and local runnable app behavior.

## Phase 1: Local MVP Architecture

Status: In progress

- Preserve local expense tracking and finance ledger behavior.
- Define shared financial types and local data migrations.
- Create the local workspace repository.
- Document production migration needs.
- Keep Prisma/Supabase integration intact.

## Phase 2: Finance MVP

Status: Not started

- Donations, expenses, transfers, accounts, cash, budgets, ledger, balances, and exports.
- All totals derived from transactions.
- Demo-mode writes persisted locally.

## Phase 3: Projects And Donor CRM

Status: Not started

- Project records with linked finance activity, timelines, placeholders, and completion reports.
- Donor CRM with lifetime giving, receipts, update history, and reminders.

## Phase 4: Tasks, Approvals, Dashboard, Reports

Status: Not started

- Approval queue and staff tasks.
- Dashboard derived from local repository data.
- Reports with filters and CSV export.

## Phase 5: Production Migration

Status: Not started

- Non-destructive Prisma migrations for MVP entities.
- Supabase Auth and role migration.
- Row-level security review.
- Production audit log verification.
