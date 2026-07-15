# SukoonOS

SukoonOS is the operating system for Sukoon Charity.

This repository is the foundation for a long-term internal platform that will support charity operations, donor relationships, case management, volunteer coordination, reporting, and future service workflows.

## Current Status

SukoonOS is moving toward a local-first MVP for charity operations.

Current working capabilities include:

- Demo mode without Supabase or database credentials.
- Professional app shell with dashboard, finance, projects, donations, donors, expenses, transfers, reports, and settings routes.
- Local-first finance workflows for donations, expenses, transfers, accounts, budgets, reports, and ledger review.
- Local expense tracker with browser persistence, edit/delete, proof attachments, proof backup export/import, search, filters, CSV export, dual PKR/USD values, and historical exchange rates.
- Workspace JSON export/import with automatic browser backups before destructive resets or imports.
- Finance Ledger and Finance module foundations for accounts, cash, budgets, balances, and reconciliation checks.
- Donor CRM and project records with linked local finance activity.
- Prisma/Supabase production foundation preserved for later migration.

The production database schema is not yet the final MVP schema. Do not claim production readiness until real credentials, migrations, auth, and route behavior are tested.

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Prisma

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

If the local development cache gets into a bad state and routes start failing with missing chunk or `_document` errors, start from a clean cache:

```bash
npm run dev:clean
```

Local demo records live only in this browser profile unless you export them from the workspace banner.

## Daily Operations

For the safest day-to-day local workflow:

1. Create or confirm donors before recording donations.
2. Create projects before linking donations, expenses, or transfers.
3. Create finance accounts before recording money movement.
4. Record donations, expenses, and transfers from their dedicated pages.
5. Export the workspace JSON regularly.
6. Export expense proofs separately whenever receipts or invoices were added.

See [docs/DAILY-OPERATIONS.md](./docs/DAILY-OPERATIONS.md) for the full local operating checklist.

## Project Structure

```text
src/
  app/              Next.js App Router shell, layouts, global styles
  components/       Shared UI and layout components
  features/         Approved product areas, grouped by domain
  hooks/            Shared React hooks
  lib/              Shared utilities and third-party clients
  server/           Server-only services and workflows
  styles/           Additional global style assets
  types/            Shared TypeScript types
prisma/             Prisma schema and future migrations
docs/               Supporting project documentation
```

## Development Principles

- Build domain-first modules instead of broad technical buckets.
- Keep server-side operations explicit and isolated.
- Prefer typed contracts at every boundary.
- Treat data privacy, auditability, and operational reliability as first-class requirements.
- Do not add pages or features before approval.

## Backend

- Supabase Auth handles sessions.
- Prisma manages relational access to Supabase Postgres.
- `UserProfile.role` controls Admin, Staff, and Volunteer access.
- API writes are validated with Zod.
- Mutations write activity logs.
- Pages no longer use sample data.

## Documentation

- [AGENTS.md](./AGENTS.md)
- [PLANS.md](./PLANS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/DAILY-OPERATIONS.md](./docs/DAILY-OPERATIONS.md)
- [PROJECT.md](./PROJECT.md)
- [ROADMAP.md](./ROADMAP.md)
- [FEATURES.md](./FEATURES.md)
- [DATABASE.md](./DATABASE.md)
