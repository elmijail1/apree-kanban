# Decisions

Source of truth for decisions made on this project. Newest at the bottom. Each entry: what we chose, why, and what we gave up.

## D1. Run Postgres in Docker (Compose)

**Decision:** Postgres 18 runs via `docker-compose.yml` at the repo root, with a named volume for data. Mapped to `127.0.0.1:5433` on the host.

**Why:**
- A reviewer can start the DB with one command, with no local Postgres install or version mismatch.
- The version and credentials are pinned in the repo, so everyone runs the same setup.
- Easy to reset (`docker compose down -v`) when testing migrations from scratch.
- Port 5433 avoids clashing with Postgres instances already on 5432 (common on dev machines).

**Trade-offs:** Requires Docker. The API and frontend run on the host (not in containers) for fast dev iteration. We may containerize them later if time allows.

## D2. pnpm workspace with one shared TypeScript version

**Decision:** The repo is a pnpm workspace (`backend`, `frontend`). TypeScript is a root devDependency pinned to `~6.0.2`. `tsconfig.base.json` holds the shared strictness options, and each package's `tsconfig.json` extends it with its own module, emit and JSX settings.

**Why:**
- One TypeScript version and one set of strictness rules across the repo.
- NestJS (decorators, `nodenext`, emits to `dist/`) and Next.js (`bundler`, `jsx: preserve`, `noEmit`) need different compiler settings, so a single shared tsconfig won't work.
- Pinned to 6.x, not 7.x, because Nest CLI 12 depends on `~6.0.2`.

**Trade-offs:** Dependency install scripts must be approved explicitly in `allowBuilds` in `pnpm-workspace.yaml` (pnpm 11 blocks them by default).

## D3. Prisma 7 as the ORM, Zod for validation

**Decision:** Prisma `7.10.1` (pinned exactly) with the `prisma-client` generator (ESM output in `backend/src/generated/prisma`, gitignored) and the `@prisma/adapter-pg` driver adapter. Requests are validated with Zod 4 through our own small `ZodValidationPipe`.

**Why:**
- Prisma gives typed queries and generates SQL migration files, which the assignment requires.
- Pinned exactly because npm's `latest` tag for `prisma` currently points to an 8.0 RC.
- `nestjs-zod` doesn't support Nest 12, and the pipe we need is only ~15 lines.
- Prisma config (`backend/prisma7.config.ts`) loads the repo-root `.env` with Node's `process.loadEnvFile`, so there is one `.env` and no `dotenv` dependency.

**Trade-offs:** The client is generated, not committed, so it needs `prisma generate` after install (done by `postinstall`).

## D4. Task model

**Decision:** One `tasks` table:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID v7 | native `uuid` column, time-ordered |
| `title` | varchar(60) | required, non-empty after trimming |
| `description` | varchar(200) | required by the API, may be `""`; no DB default |
| `priority` | enum `low \| normal \| high` | required by the API |
| `status` | enum `new \| inProgress \| completed` | defaults to `new`; DB value `in_progress` |
| `createdAt` / `updatedAt` | timestamptz | `updatedAt` changes on any edit |
| `statusChangedAt` | timestamptz | when the task entered its current column |

Columns are ordered by `statusChangedAt DESC, id DESC`, backed by the index `(status, status_changed_at)`. The service bumps `statusChangedAt` only when the status actually changes. Editing content or sending the same status leaves it alone.

**Why:**
- Postgres enums and varchar limits enforce the rules in the DB too, not only in the API.
- Sorting by when a task entered its column puts recently moved tasks on top. `updatedAt` can't do this because content edits also bump it.
- `timestamptz` avoids time-zone bugs from Prisma's default `timestamp`.

**Trade-offs / limitations:**
- No manual reordering within a column (no `position` field). Tasks can only be moved between columns.
- Tasks can move between any statuses in any direction.
- No users, assignees, due dates or soft delete.
