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

## D5. Board API with per-column cursor pagination

**Decision:**
- `GET /tasks?status=<new|inProgress|completed>&limit=<1..50, default 5>&cursor=<opaque>` returns one page of one column: `{ items: Task[], nextCursor: string | null }`. `status` is required. Without `cursor` it returns the first page; with `nextCursor` from the previous response, the next one.
- The cursor is keyset-based. It encodes the last task's `(statusChangedAt, id)` as base64url, and `id` breaks ties between tasks moved in the same millisecond.
- *Revised:* an earlier `status=all` mode (all three columns in one response, keyed by status) was removed once each column got its own query (D8). Nothing used it.
- `PATCH /tasks/:id/status` with `{ status }` is a dedicated endpoint for moves. It's one conditional `UPDATE … WHERE status <> :new`, so `statusChangedAt` changes only on a real move.
- API on port 3001 (`API_PORT`), CORS for `WEB_ORIGIN` (default `http://localhost:3000`).

**Why:**
- The board never loads the whole table, only 5 tasks per column, then more for one column on scroll.
- Keyset pagination stays fast at any depth and doesn't skip or repeat rows when tasks are added or moved between page loads. Offset pagination would do both.
- The cursor is opaque because the client only needs to pass `nextCursor` back. A bare timestamp would break on ties.

**Trade-offs:** A task moved into a column while the user is paging lands above the loaded pages, so the client must insert its own moves locally. The index is `(status, status_changed_at)` without `id`, so ties are resolved after the index lookup, which is fine at this scale.

## D6. Remaining task endpoints; no `GET /tasks/:id`

**Decision:**
- `PATCH /tasks/:id` edits content only (`title`, `description`, `priority`; any subset, at least one). `status` in this body is rejected, so moves always go through `PATCH /tasks/:id/status` and its `statusChangedAt` rule.
- `DELETE /tasks/:id` is a hard delete and returns `204`.
- A missing task returns `404` from both (Prisma error `P2025`).
- There's no `GET /tasks/:id`. The list already returns full tasks, so the detail view uses the data it has.
- On create, `createdAt` and `statusChangedAt` are set from one app-side timestamp. The DB and app clocks drift by tens of ms in Docker, and mixing them made `createdAt` look later than `statusChangedAt`.

**Trade-offs:** No deep link or refresh-safe URL for a single task. Adding one later means adding `GET /tasks/:id` back.

## D7. Frontend stack and API access

**Decision:**
- Next.js 16 (App Router, Turbopack, `src/` dir), MUI 9 with Emotion via `@mui/material-nextjs` (`AppRouterCacheProvider` from `v16-appRouter`), Roboto via `next/font/google` (latin + cyrillic) exposed as `--font-roboto`.
- TanStack Query 5 for all server state. One `QueryClient` per browser session (`staleTime` 30s, `retry` 1). Devtools are included and dropped from production builds automatically.
- The browser calls the API through a Next rewrite: `/api/:path*` → `${API_URL ?? 'http://localhost:3001'}/:path*`.
- Removed scaffold defaults: Tailwind, `cacheComponents`, `partialPrefetching`.
- Zod 4 on the frontend for form validation, with the same limits as the API, copied rather than shared.
- oxlint as the linter (same as the backend). No ESLint.

**Why:**
- `useInfiniteQuery` maps directly onto the per-column cursor pagination (D5) and gives loading and error states the assignment requires. Mutations give optimistic moves.
- The same-origin proxy means no CORS, no API URL baked into the client bundle, and no need for a frontend `.env` (Next only reads env files from `frontend/`).
- `cacheComponents` forces `<Suspense>` boundaries around dynamic data at build time and `partialPrefetching` optimizes links. Neither helps a single client-fetched page.
- Copying 3 validation rules is cheaper than a shared package with its own build setup.

**Trade-offs:** Validation limits live in two places (backend `tasks.schemas.ts`, frontend). They must be changed together. The backend's CORS setting stays as a fallback for direct calls.

## D8. Board rendering: server board, client columns with their own queries

**Decision:**
- `Board` is a server component: the header, the "Добавить задачу" button and a responsive grid (one column on mobile, three on `md`+, each column scrolling on its own).
- `TaskColumn` is a client component. Each column runs its own `useInfiniteQuery` (`['tasks', status]`, `GET /tasks?status=<status>&limit=5`), loads the next page when a sentinel at the bottom of its list scrolls into view, and has its own loading (skeletons), error (with retry) and empty states.
- Cards are client components, because they render data fetched in the browser.

**Why:**
- Independent columns: one failing or paging column doesn't affect the others, and each maps directly onto one infinite query.
- Data is fetched in the browser, so the page itself stays static, and the loading and error states the assignment requires live in one place.

**Trade-offs:** The initial load is 3 parallel requests, one per column. `status=all` was removed from the API as a result (see D5).

## D9. Card shows title and priority; details in a separate read-only dialog

**Decision:**
- The card shows only the title, the priority chip and the edit/delete icon buttons. The description is shown only in the detail dialog.
- Clicking anywhere on the card opens `TaskDetailsDialog`: title, priority, status, created date (ru-RU format), full description, and Edit and Delete buttons at the bottom. Closing is a cross icon in the top-right corner, not a bottom button, so it doesn't compete with the real actions. The cross, a backdrop click and Escape all use the same `onClose`. On phones (below `sm`) the dialog is full-screen.
- The card is clickable through its title button stretched over the whole card (`::after` overlay), with the icon buttons layered above it. Hovering highlights the card (`grey.100`) and shows a pointer cursor.
- The detail view is separate from the future editor.
- Each card keeps its own `open` state.

**Why:**
- Keeps cards compact, so more fit in a column.
- The stretched title button keeps the whole card clickable without nesting buttons inside a button, which breaks accessibility, and keyboard users get a real focusable button.
- State per card is the least code for now.

**Trade-offs:** No URL for an open task. Moving the open state into the URL is listed in `docs/ideas.md`.
