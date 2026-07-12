# SukoonOS

SukoonOS is the operating system for Sukoon Charity.

This repository is the foundation for a long-term internal platform that will support charity operations, donor relationships, case management, volunteer coordination, reporting, and future service workflows.

## Current Status

Sprint 3 backend foundation is implemented. Pages are wired through authenticated server-side data loaders and secure API routes, but a real Supabase project must be configured before migrations and runtime verification can be completed.

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

- [PROJECT.md](./PROJECT.md)
- [ROADMAP.md](./ROADMAP.md)
- [FEATURES.md](./FEATURES.md)
- [DATABASE.md](./DATABASE.md)
