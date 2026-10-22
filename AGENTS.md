# AGENTS.md

Instructions for AI coding agents working in this repo. Keep this file current as conventions are agreed.

## Project

Kanban task tracker, built as a test assignment (spec: `docs/assignment.md`).

- `backend/` — NestJS API (TypeScript)
- `frontend/` — Next.js + React + Material UI
- `docs/decisions.md` — decision log; the source of truth for agreed choices. Check it before proposing alternatives, and add an entry when a new decision is made.

## Local environment

- Postgres runs via Docker Compose: `docker compose up -d` from the repo root.
- Host port is **5433** (not 5432) to avoid clashing with other local Postgres instances.
- Connection settings live in `.env` (copy from `.env.example`). Never commit `.env`.
