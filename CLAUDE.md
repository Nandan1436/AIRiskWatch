# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AIRiskWatch is an AI incident intelligence platform: a FastAPI backend serving the AI Incident
Database corpus (MIT taxonomy scope) from PostgreSQL + pgvector, and a React frontend for
browsing/exploring incidents. It's a two-package monorepo — `backend/` and `frontend/` — with no
shared code between them; they only communicate over HTTP.

There are no automated tests in either package yet (no pytest/vitest config, no `test` script).

## Commands

### Backend (run from `backend/`)

```bash
docker compose up -d                        # start Postgres (pgvector image)
.venv\Scripts\activate                       # Windows; source .venv/bin/activate elsewhere
pip install -r requirements.txt
python scripts/import_seed.py                # (re)load the seed CSV corpus after schema changes
uvicorn app.main:app --reload                # http://127.0.0.1:8000, docs at /docs
```

Loading `db/schema.sql` needs `psql` via the running `db` container — on Windows PowerShell,
`<` redirection doesn't work, so use:
```powershell
Get-Content db\schema.sql -Raw | docker compose exec -T db psql -U airiskwatch -d airiskwatch
```
The compose project name is pinned to `airiskwatch` in `docker-compose.yml` (Compose otherwise
derives it from the folder name) — don't remove that pin, or the seeded `airiskwatch_pgdata`
volume will silently detach.

### Frontend (run from `frontend/`)

```bash
npm install
npm run dev       # Vite dev server, default http://127.0.0.1:5173
npm run build     # tsc -b (type-check via project references) && vite build
npm run preview
```

There is no `lint` script and no ESLint config in this package currently, even though
`frontend/docs/08-tooling-and-config.md` describes one as the template default — don't assume
`npm run lint` exists.

Both packages need a `.env` copied from `.env.example` (`VITE_API_BASE_URL` for the frontend;
`POSTGRES_*` / `SEED_DATA_DIR` for the backend) before running.

## Architecture

### Backend — layered FastAPI, no repository layer

`app/routes/ → app/services/ → app/models/ (SQLAlchemy)`, with `app/schemas/` (Pydantic) as the
API contract. Full conventions are documented in `backend/docs/` (`architecture.md`,
`coding_conventions.md`, `database_patterns.md`, `error_handling.md`, `folder_structure.md`,
`naming_conventions.md`) — those docs describe a repository layer as optional; this codebase
does **not** use one. Services query SQLAlchemy models directly (see
`app/services/risk_domain_service.py` for the pattern: `select(...)` + `func` aggregates, business
computation kept in the service, thin route just injects the service via a
`get_<resource>_service` `Depends` factory and returns the Pydantic response model).

Key files: `app/main.py` (app + CORS + router registration), `app/config.py` (env-driven
`DATABASE_URL`/`CORS_ORIGINS`, assembled from `POSTGRES_*` if `DATABASE_URL` isn't set directly),
`app/database.py` (engine/session/`get_db`).

Only the MIT taxonomy import is in scope for v1: `incidents.csv`, `reports.csv`,
`classifications_MIT.csv` from `backend/MIT_AI_RISK_REPOSITORY/`. CSET/GMF classifications, the
mitigation crosswalk, and entity graph data are deferred — don't assume routes/models for those
exist.

### Frontend — layered React, no auth

`pages/ → containers/ → hooks/ (→ services/ → api/apiClient.ts)`, with presentational
`components/` fed via props and `interfaces/` as the shared type source. Full conventions are in
`frontend/docs/` (numbered `01`–`09`) — written as a reusable template, so some of it doesn't
apply here: there's **no auth/session** in this app (no `ProtectedRoute`/`GuestRoute`/Context for
a user), so `frontend/docs/07-routing-and-auth.md`'s guard patterns are template reference only,
not implemented. `context/` currently holds only `ThemeContext`.

Real examples of the pattern to follow when adding a new domain:
`src/services/incidentService.ts` (plain async functions unwrapping `apiClient` responses) →
`src/hooks/incidentHooks/useIncidentQuery.ts` (`useQuery` wrappers, array query keys like
`["incidents", params]` / `["incident-detail", id]`, `staleTime` set, errors normalized to
`(error as Error).message`) → `src/containers/*Container.tsx` → `src/pages/*.tsx` (registered in
the single route table `src/routes/AppRoutes.tsx`, pages imported from the `pages` barrel).

Styling is Tailwind + co-located CSS Modules (`<Name>.module.css` next to its component), tokens
in `src/styles/global.css`. `src/config/env.ts` is the only place `import.meta.env` is read.

## Data note

`backend/MIT_AI_RISK_REPOSITORY/` contains the source AI Incident Database corpus/seed dump plus
project spec/design documents (`AIRiskWatch_Spec_And_Plan.md`,
`AIRiskWatch_Design_Decisions_2026-06-22.md`) — read these for product/design rationale rather
than inferring intent from code alone when it's ambiguous.
