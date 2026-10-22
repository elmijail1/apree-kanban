# Ideas

Possible improvements beyond the assignment's scope. Not commitments: when one gets picked up, its decision goes into `decisions.md`.

## Link to a task's detail view

Put the open task's id in the URL (e.g. `/?task=<id>`) when the detail view is open, so a task can be shared or reopened by link and survives a page reload.

- Needs `GET /tasks/:id` back in the API (removed in D6), because the linked task may not be on the loaded pages of its column.
- The dialog's open state moves from the card into the URL (`useSearchParams`), and closing the dialog removes the parameter.
- An unknown or deleted id should show a "task not found" message, not an empty dialog.
