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
- **Column heights** are sized in cards (single-line card ≈ 85px, gap 8px), so the next-page sentinel starts out of view:
  - **Desktop:** a fixed list height of ≈ 4.5 cards (431px; `maxHeight` is set per breakpoint, because an `xs` value would also apply on `md`). All 5 cards of the first page fit, with the 5th partly cut off. Columns are equal height and don't stretch to the viewport.
  - **Mobile:** a maximum of ≈ 2.6 cards (253px). This keeps stacked columns short, so it's easy to scroll past one to the next. Empty or short columns shrink to their content.
  - **Mobile spacing:** 24px between stacked columns (16px on desktop), and 32px of extra right padding on the column grid. Together with the page padding, that leaves a 48px strip on the right for scrolling the page without catching a column's own scroll.
  - **Bottom fade:** every column has a 24px gradient overlay at its bottom edge, fading to the column background (`::after` at `left/right/bottom: 0`, `pointer-events: none`; absolute offsets count from inside the border, so a 1px offset left a gap where the card underneath showed as a line). It's hidden while the column is a drop target. The list's bottom padding is 16px, so at the very end the fade mostly covers empty space.
  - *Revised:* columns originally filled the viewport height on desktop. On a tall screen all 5 cards and the sentinel were visible at once, so the second page loaded immediately.
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
- *Revised in D12:* each card originally kept its own `open` state. The dialogs now live in one board-level provider.

**Why:**
- Keeps cards compact, so more fit in a column.
- The stretched title button keeps the whole card clickable without nesting buttons inside a button, which breaks accessibility, and keyboard users get a real focusable button.

**Trade-offs:** No URL for an open task. Moving the open state into the URL is listed in `docs/ideas.md`.

## D10. Editing and deleting from the card and the detail view

**Decision:**
- **Edit mode** happens inside the detail dialog and keeps its layout:
  - amber background;
  - a «⚠️ Режим редактирования» banner on top;
  - the title becomes an underlined text field;
  - the description becomes a multiline field;
  - the bottom buttons change to «Отмена» / «Сохранить» (primary).
- **Edit mode rules:**
  - Title, description and priority are editable.
  - Validation uses the same Zod limits as the API (`frontend/src/lib/taskSchema.ts`), with a character counter under each field.
  - Only changed fields are sent; with no changes, Save just leaves edit mode.
- **Closing edit mode:**
  - The close cross sits at the right end of the edit-mode banner (the dialog's top-right corner in this mode). Like a backdrop click, it discards the edits and closes the dialog, wherever editing started.
  - «Отмена» and Escape go back to where editing started: the column if it was the card's edit icon, the detail view if it was the dialog's «Редактировать». The dialog state records this as `{ kind: "edit", from: "column" | "details" }`.
  - A backdrop click discards the edits and closes the dialog entirely.
  - A successful save returns to the detail view.
  - While a dialog closes, the card keeps its last kind (only `open` flips), so the closing dialog doesn't flash back to the view layout during its fade-out.
- **Delete** always goes through a confirmation dialog: «Вы уверены, что хотите удалить «…»? Это действие нельзя отменить», with «Отмена» and a red «Удалить». From the detail view, the details dialog is replaced by the confirmation. «Отмена» closes the confirmation and does not return to the details.
- **Card buttons:** the edit icon opens the detail dialog straight in edit mode, and the delete icon opens the confirmation.
- **Cache updates:** after a mutation succeeds, the task is replaced in or removed from the column's cached pages (`setQueryData` on `['tasks', status]`). Nothing is re-fetched, because content edits don't change the order and deletes only remove a row.
- **Deleting an already-deleted task:** a `404` on delete counts as success, since the task is gone either way.

**Trade-offs:**
- After deletes, loaded pages can be shorter than 5. The keyset cursor still continues correctly.

## D11. Priority picker in the detail dialog

**Decision:**
- In the detail dialog, the priority chip is clickable (with a ▾ arrow) and opens a menu with the other two priorities, each shown as its coloured chip. Cards keep a plain, non-clickable chip.
- **View mode:** choosing a priority saves it immediately (`PATCH /tasks/:id` with `{ priority }`). While the request runs, the chip already shows the new value and is disabled. On failure, it reverts and the dialog shows the save error.
- **Edit mode:** the choice only changes the draft. It's sent with the title and description on «Сохранить», and discarded on «Отмена».

**Why:** A priority change is a single quick action, so in view mode it doesn't need a whole edit-mode round trip. Edit mode keeps its rule that nothing is saved until «Сохранить».

**Trade-offs:** The same control behaves differently in the two modes. The amber edit-mode styling is what tells the user which rule applies.

## D12. Status picker and board-level task dialogs

**Decision:**
- **Status picker:** the detail dialog's status chip works like the priority one (D11). In view mode a choice saves immediately through `PATCH /tasks/:id/status`. In edit mode it's part of the draft. Both pickers use one generic `ChipPicker`.
- **Saving in edit mode** sends the content `PATCH` first (only if something changed), then the status `PATCH` (only if the status changed). There are two requests because the API keeps moves on their own endpoint (D5, D6).
- **Cache after a move:** no re-fetch. The task is removed from the old column's cached pages and put at the top of the new column's first page. That's where the server sorts it, because its `statusChangedAt` is now the newest in that column, and the keyset cursors of later pages stay valid. Columns that were never loaded are left alone and fetch fresh data when they appear. *Revised in D14:* this update now happens optimistically, before the response, with rollback on error.
- **Dialogs moved out of the cards:** a client `TaskDialogsProvider` wraps the board. It holds `{ task, view, open }` and renders one `TaskDetailsDialog` and one `DeleteTaskDialog`. Cards call `useOpenTask()(task, view)`. The provider updates its task copy from each mutation's response, so the dialog shows fresh data.

**Why:**
- A moved task's card unmounts from the old column and mounts in the new one. A dialog that lived inside the card would vanish mid-interaction.
- One dialog instance for the whole board instead of one per card.
- This is the groundwork for the task-link idea (`docs/ideas.md`): an open task in the URL would only need to feed this provider.

**Trade-offs:**
- Saving in edit mode isn't atomic. If the content saves and the move fails, the content stays saved and the dialog stays in edit mode with an error; saving again retries the move.
- The dialog shows a copy of the task taken when it was opened, refreshed only by its own mutations. If a column re-fetches meanwhile, the dialog doesn't update.

## D13. Create-task dialog

**Decision:**
- «Добавить задачу» opens `CreateTaskDialog`. It has the editor's layout without the edit-mode styling:
  - white background and no banner;
  - an empty underlined title field with the placeholder «Название задачи»;
  - a priority chip that starts as «Выберите…» (no default);
  - the editor's description field;
  - «Отмена» / «Сохранить».
- No status or created date: new tasks always start in `new` (the API default).
- The close cross, a backdrop click and Escape all work like «Отмена»: they discard the form and close the dialog.
- «Сохранить» stays disabled until the title is valid and a priority is chosen. The empty-title error appears only after the user has typed in the field, so a fresh form doesn't open with an error.
- On success the dialog closes and the task goes to the top of the cached «Новая» column. That's where the server sorts it, so there's no re-fetch.
- The title field, description field, priority picker and field label are shared with the editor (`TaskFormFields.tsx`). `ChipPicker` supports an empty value with a placeholder for this.
- The provider exposes `openCreate()` next to `openTask()`. The header button is a small client `AddTaskButton`, so `Board` stays a server component.

**Why:** A forced priority choice was asked for explicitly («Выберите…»). The API also requires it, so there's no default to fall back on. Sharing the fields keeps creating and editing identical by construction.

## D14. Drag-and-drop between columns (desktop only)

**Decision:**
- **Library:** `@dnd-kit/core`, without the sortable package: cards are draggable (`useDraggable`) and columns are drop targets (`useDroppable`, id = status). The order inside a column isn't touched. A dropped task becomes the latest status change, so it lands on top (D4, D5).
- **Desktop only:**
  - One sensor is always registered: `DesktopMouseSensor`, a `MouseSensor` subclass. Its activator checks `(min-width: md) and (hover: hover) and (pointer: fine)` with `matchMedia` at `mousedown` and refuses to start a drag otherwise. The check isn't done by switching the sensor list in React state, because dnd-kit's `useSensorSetup` uses the list as an effect dependency array. Changing its length after hydration (0 → 1) triggers React's "dependency array changed size" error. Checking at drag start also handles window resizes.
  - Touch devices, narrow windows (stacked columns) and keyboard users move tasks with the status picker in the detail dialog (D12).
- **Clicks keep working:** a drag starts only after the mouse moves 5px, so a click still opens the details.
- **Card accessibility attributes:** only dnd-kit's listeners are spread onto the card, not its `attributes` (`role="button"`, `tabIndex`, `aria-describedby`), so the card keeps its own accessible structure.
- **Drag visuals:**
  - The dragged card is drawn in a `DragOverlay` (columns clip their scrolling content) as a raised card with a grabbing cursor. The original card fades to 40%.
  - Collision detection is `pointerWithin`: the column under the mouse pointer is the target, and it gets a primary-coloured tint and outline. Dropping on the task's own column or outside any column does nothing.
  - The drop has no animation (`dropAnimation={null}`), because the card is already in its new column.
- **The move is optimistic:**
  - `useMoveTask` removes the task from the old column and puts it on top of the new one right away, with `statusChangedAt` set to now.
  - On success, the server's version replaces it. On error, both columns are restored from a snapshot and a snackbar says «Не удалось переместить задачу».
  - This also applies to status changes from the detail dialog.
- **Screen-reader announcements** are in Russian. `DndContext` has a fixed `id` to avoid hydration mismatches from its generated ids.

**Why:**
- A drop has to feel instant. Waiting for the response would snap the card back to its old column for a moment.
- Dragging between stacked columns on a phone is clumsy and fights with scrolling. The status picker already covers that case.

**Trade-offs:**
- Reordering within a column isn't supported (as in D4).
- If a column re-fetches while a move is in flight, the optimistic entry can be overwritten. The move cancels both columns' in-flight queries first to make this unlikely.

## D15. Tests: 6 API tests on a test database, 3 frontend logic tests

**Decision:**
- **Backend API tests** (`backend/test/tasks.e2e-spec.ts`, `pnpm test:e2e`) boot the real `AppModule` with supertest against a separate `kanban_test` database. Its URL comes from `DATABASE_URL` with `_test` appended, or from `TEST_DATABASE_URL`. A Vitest global setup runs `prisma migrate deploy`, which also creates the database. Each test empties `tasks` first. Files run sequentially. The tests:
  1. create (trimming, `new` status, equal timestamps);
  2. validation of bad inputs (one table-driven test);
  3. walking a column page by page with ties on `statusChangedAt`: no gaps, no duplicates, correct order;
  4. a move puts the task first in the new column and bumps `statusChangedAt` and `updatedAt`;
  5. `statusChangedAt` is unchanged by a repeated status or a content edit;
  6. `status` is rejected in content edits, and `DELETE` returns 204 then 404.
- **Frontend tests** (`pnpm test` in `frontend/`) are Node-only Vitest tests of pure logic:
  1. `taskContentSchema` (trimming, 60/200 limits, matching the API);
  2. cache updates for a move;
  3. cache updates for create, delete and edit.

  To make them testable, the cache updates moved out of the mutation hooks into `lib/taskCache.ts` (`removeTask`, `replaceTask`, `prependTask`). `prependTask` now also removes an existing copy of the task first, so a task can't appear twice.
- The existing cursor unit tests (`task-cursor.spec.ts`) stay. The scaffold's "Hello World" e2e test is removed.
- **Root scripts:** `pnpm test` runs the backend unit tests and frontend tests, with no database needed. `pnpm test:e2e` runs the API tests.

**Why:**
- The tests cover the rules that would break silently: keyset pagination with ties, the `statusChangedAt` rule (D4), validation, and the client's cache bookkeeping, which drag-and-drop and the dialogs rely on.
- Checked that the pagination test fails when the tie-breaker is broken (`id lt` → `id gt`).
- `prisma migrate reset` isn't used: Prisma blocks it when it detects an AI agent, and `migrate deploy` plus emptying the table is enough.

**Trade-offs:**
- No component or UI tests: dialogs and drag-and-drop are checked manually.
- The API tests need Docker Postgres running.
