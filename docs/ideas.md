# Ideas

Possible improvements beyond the assignment's scope. Not commitments: when one gets picked up, its decision goes into `decisions.md`.

## Link to a task's detail view

Put the open task's id in the URL (e.g. `/?task=<id>`) when the detail view is open, so a task can be shared or reopened by link and survives a page reload.

- Needs `GET /tasks/:id` back in the API (removed in D6), because the linked task may not be on the loaded pages of its column.
- The dialog state in `TaskDialogsProvider` (D12) is driven by the URL (`useSearchParams`), and closing the dialog removes the parameter.
- An unknown or deleted id should show a "task not found" message, not an empty dialog.

## Reordering tasks inside a column by drag-and-drop (desktop and mobile)

Let users drag a card up or down within its column to set its order, on desktop and on touch devices.

- Needs a `position` field on each task, and columns sorted by it instead of `statusChangedAt` (D4, D5). A move to another column would place the task at the top, the lowest position.
- Use fractional or gapped positions (e.g. a decimal or a lexicographic rank string), so a reorder updates only the moved task, not every task below it.
- The cursor (D5) would encode `(position, id)` instead of `(statusChangedAt, id)`, and the index changes to `(status, position)`. That's a migration that backfills positions from the current order.
- Frontend: `@dnd-kit/sortable` on top of the current `@dnd-kit/core` setup (D14). It also needs a touch sensor with a press-and-hold delay, so dragging doesn't conflict with scrolling, and the desktop-only restriction goes away.
- Reordering only works within the loaded pages. Dropping between two loaded cards is enough to compute the new position.
