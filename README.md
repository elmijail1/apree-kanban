# Kanban task tracker

A small task-tracking app with a 3-column kanban board («Новая», «В работе», «Готово»). Tasks can be created, viewed, edited, deleted and moved between columns. Data is stored in PostgreSQL and served by a NestJS API. The UI is built with Next.js and Material UI and works on desktop and mobile.

The original task is in [docs/assignment.md](docs/assignment.md). Every design decision, with its reasoning, is recorded in [docs/decisions.md](docs/decisions.md).

## Running the app

**Requirements:** Node.js 22.12+ (developed on 26), pnpm 11, Docker.

```sh
git clone https://github.com/elmijail1/apree-kanban.git .  # from an empty dir
cp .env.example .env
pnpm install                     # also generates the Prisma client
pnpm db:up                       # Postgres 18 in Docker, on localhost:5433
pnpm --filter @apree-kanban/backend exec prisma migrate deploy
```

Then start the API and the web app, each in its own terminal:

```sh
pnpm --filter @apree-kanban/backend start:dev    # API on http://localhost:3001
pnpm --filter @apree-kanban/frontend dev         # app on http://localhost:3000
```

Open http://localhost:3000. The browser talks only to the Next.js server, which proxies `/api/*` to the API.

**Tests:**

```sh
pnpm test        # backend unit tests + frontend logic tests, no database needed
pnpm test:e2e    # API tests against a separate kanban_test database (needs `pnpm db:up`)
```

## Main solutions

### Data model

One `tasks` table (Prisma 7, migrations in `backend/prisma/migrations`):

- **Fields:** `id` (UUID v7), `title` (≤ 60 characters), `description` (≤ 200, may be empty), `priority` (`low | normal | high`) and `status` (`new | inProgress | completed`). Priority and status are Postgres enums, so the database enforces them too.
- **Timestamps:** `createdAt`, `updatedAt` and `statusChangedAt`. `statusChangedAt` records when the task entered its current column, and it's what columns are sorted by. Editing the title, description or priority doesn't change it; only a real status change does.

### API

| Method | Path         | Purpose                                                                                                 |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| GET    | `/tasks`     | One page of one column: `?status=new&limit=5&cursor=…` → `{ items, nextCursor }`                        |
| POST   | `/tasks`     | Create a task (`title`, `description`, `priority`); it starts in `new`                                  |
| PATCH  | `/tasks/:id` | Change any of `title`, `description`, `priority`, `status`. A status change also sets `statusChangedAt` |
| DELETE | `/tasks/:id` | Delete a task                                                                                           |

- **Validation:** every request is validated with Zod (with trimming and length limits). Invalid input gets a 400 with per-field messages, and a missing task gets a 404.
- **Pagination** is keyset-based, never offset. The cursor encodes the last task's `(statusChangedAt, id)`. Loading more is fast at any depth and never skips or repeats tasks, even when several tasks share a timestamp or tasks move between page loads.
- **Status changes** go through the same `PATCH` endpoint, but `statusChangedAt` is updated in the same transaction only when the status actually differs. That's why saving an edit with a new status is one atomic request.

### Frontend

- **Layout:** Next.js (App Router) with Material UI. The board is server-rendered, and each column is a client component that loads its own tasks.
- **Data:** TanStack Query, with one infinite query per column. Each column loads 5 tasks first, then 5 more when you scroll to its bottom. Each column has its own loading, error (with retry) and empty states.
- **Ordering:** a column shows the most recently arrived tasks first. A newly created task, or one moved into a column, appears at the top, which matches how the server sorts it. After a change the app updates its local copy of the columns directly instead of reloading them, and moves happen instantly, rolling back if the server rejects them.
- **Task dialogs:**
  - **Details:** clicking a card opens a read-only view with the title, priority, status, created date and full description. Priority and status can be changed right there from a dropdown.
  - **Edit mode:** a highlighted mode for the same dialog. Changes are saved with «Сохранить» or discarded with «Отмена».
  - **Create:** a similar form for new tasks, where choosing a priority is required.
  - **Delete:** always asks for confirmation first.
- **Moving tasks:** on desktop, drag a card onto another column (`@dnd-kit/core`). On mobile, or from the keyboard, change the status in the task dialog.
- **Mobile:**
  - Columns stack vertically and are kept short.
  - A strip on the right lets you scroll the page without catching a column's own scroll.
  - Dialogs open full-screen.

## Limitations

1. **No custom ordering.** Tasks are always sorted by when they entered their column; there's no manual reordering.
2. **Drag-and-drop works only between columns, and only on desktop.** Cards can't be dragged within a column, and on touch devices tasks are moved through the status picker.
3. **No separate URL per task.** An open task can't be linked to and doesn't survive a page reload, and the API has no `GET /tasks/:id`.
4. **No users or authentication.** There's one shared board, with no assignees or permissions.
5. **No real-time sync.** Changes made in another tab or by another person appear only when a column re-fetches: when the window regains focus and its data is over 30 seconds old, or on reload. An open dialog shows the task as it was when opened.

## Improvement ideas

More detail in [docs/ideas.md](docs/ideas.md).

- **A link to a task's detail view.** Put the open task's id in the URL (e.g. `/?task=<id>`), so a task can be shared or reopened after a reload.
  - Add `GET /tasks/:id` back to the API, because a linked task may not be on a loaded page.
  - Drive the existing board-level dialog state from the URL, and remove the parameter on close.
  - Show "task not found" for an unknown or deleted id.
- **Reordering within a column by drag-and-drop, on desktop and mobile.**
  - Add a `position` field and sort columns by it. Use fractional or rank-string positions, so a reorder updates only the moved task.
  - Switch the cursor and index to `(status, position)`, with a migration that backfills positions from the current order.
  - On the frontend, use `@dnd-kit/sortable` with a touch sensor that needs a press-and-hold, so dragging doesn't fight scrolling.

## Time spent

About 5 hours.
