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
- Package manager is pnpm (workspace). TypeScript lives at the root; package tsconfigs extend `tsconfig.base.json`.

## Working agreement

- **Don't install packages or run scaffolders.** Suggest the exact commands and let the user run them.

## Database (Prisma)

- Schema: `backend/prisma/schema.prisma`. Config: `backend/prisma7.config.ts` (reads the root `.env`).
- Any schema change needs a migration: `pnpm --filter @apree-kanban/backend db:migrate --name <change>`, then `db:generate` (Prisma 7's `migrate dev` no longer regenerates the client). Never edit an applied migration; add a new one.
- The generated client (`backend/src/generated/prisma`) is gitignored. Don't edit it. Regenerate with `db:generate`.
- Use camelCase in Prisma models and snake_case in the DB (`@map`/`@@map`).
- `statusChangedAt` must be set by the service when, and only when, `status` changes (see D4 in `docs/decisions.md`).

## Backend conventions

- ESM with `nodenext`: relative imports need the `.js` extension (`./tasks.service.js`).
- Validate every request part (body, query, params) with a Zod schema via `ZodValidationPipe`. Schemas and their inferred types live in `<module>.schemas.ts`. Validate route ids with `ParseUUIDPipe`.
- Inject `PrismaService` (global module). Don't create `PrismaClient` elsewhere.
- Format with `pnpm exec prettier --write src`; check with `pnpm exec tsc --noEmit -p tsconfig.json` and `pnpm lint`.
