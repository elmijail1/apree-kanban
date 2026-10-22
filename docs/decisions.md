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
