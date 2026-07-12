# SukoonOS Database

SukoonOS will use Supabase Postgres as the primary database.

Prisma is included because the project is expected to need typed relational models, migrations, and long-term schema discipline. Supabase should still be used where it is strongest, including authentication, storage, realtime features, and platform management.

## Current Status

Sprint 3 defines the first production schema for SukoonOS.

The Prisma schema now includes:

- Supabase-linked user profiles and roles.
- Donors and donations.
- Projects and project-linked expenses.
- Bank accounts and internal transfers.
- Reports.
- Application settings.
- Tasks.
- Activity logs.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public browser-safe Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only administrative Supabase key |
| `DATABASE_URL` | Pooled database connection for application runtime |
| `DIRECT_URL` | Direct database connection for Prisma migrations |

## Modeling Principles

- Prefer explicit names over abbreviations.
- Track ownership and timestamps on important operational records.
- Design for auditability before automation.
- Avoid storing sensitive personal data unless the workflow requires it.
- Use row-level security in Supabase for user-facing data access.
- Keep service-role operations server-only.

## Role Model

SukoonOS supports three roles:

- `ADMIN`: full access, settings management, destructive actions.
- `STAFF`: operational read/write access.
- `VOLUNTEER`: read-only access.

Supabase Auth remains the identity provider. The local `UserProfile` table stores app-specific role, title, active status, and display information.

## Runtime Access

Pages and API routes use Supabase sessions for authentication. Server-side data access uses Prisma against Supabase Postgres.

Settings routes are Admin-only. Operational create/update routes are Admin/Staff. Read routes are available to all authenticated roles unless explicitly restricted.

## Migration Policy

Future schema changes should use Prisma migrations unless a Supabase-native feature requires SQL directly.

Every migration should include:

- The reason for the change.
- Expected data impact.
- Rollback or recovery notes when relevant.
- Review of row-level security implications.
