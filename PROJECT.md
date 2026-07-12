# SukoonOS Project Charter

## Purpose

SukoonOS is a long-term software platform for Sukoon Charity. Its purpose is to give the organization a reliable operating system for managing people, funds, cases, programs, communications, and reporting.

## Product Direction

SukoonOS should become a calm, trusted, operational workspace for charity teams. It should help staff and volunteers make better decisions, reduce manual coordination, preserve institutional memory, and serve people with dignity.

## Early Priorities

- Establish a secure technical foundation.
- Define the core charity operating domains.
- Build only approved workflows.
- Keep sensitive data protected by default.
- Make future reporting and audit trails easy to support.

## Architecture Principles

- Use the Next.js App Router as the primary application framework.
- Use Supabase for authentication, storage, realtime needs, and managed Postgres infrastructure.
- Use Prisma where typed relational data modeling and migrations are useful.
- Keep feature code organized by domain under `src/features`.
- Keep shared UI primitives under `src/components`.
- Keep platform integrations under `src/lib`.
- Keep server-only business workflows under `src/server`.

## Non-Goals For This Foundation Stage

- No product pages.
- No dashboard.
- No donor, beneficiary, volunteer, or admin workflows.
- No production database models beyond the initial Prisma datasource.
- No visual brand system beyond the shadcn/Tailwind baseline.

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-11 | Initialize foundation before application pages | Keeps architecture intentional before feature work begins. |
| 2026-07-11 | Include Prisma with Supabase Postgres | Prisma is appropriate for typed relational modeling, migrations, and long-term maintainability. |
| 2026-07-11 | Use domain-first feature folders | Charity operations will grow across multiple domains and need clear ownership boundaries. |
| 2026-07-11 | Use Supabase Auth plus local user profiles | Supabase owns identity while SukoonOS owns app roles, active status, and operational permissions. |
| 2026-07-11 | Restrict settings to Admin role | Settings can contain sensitive organization and finance configuration. |
