# AIRiskWatch

AI incident intelligence platform: a FastAPI backend serving the AI Incident Database
corpus (MIT taxonomy scope) from PostgreSQL + pgvector, and a React frontend for
browsing incidents.

- [`backend/`](backend/README.md) — FastAPI application, database schema, and API
- [`frontend/`](frontend/) — React + Vite + TypeScript client

## Prerequisites

- Docker (for PostgreSQL)
- Python 3.11+
- Node.js 18+

## Backend setup

All commands below run from `backend/`.

```bash
cp .env.example .env        # set SEED_DATA_DIR to a path relative to backend/, e.g. ./MIT_AI_RISK_REPOSITORY/backup-20260601120109
docker compose up -d
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
docker compose exec -T db psql -U airiskwatch -d airiskwatch -f /dev/stdin < db/schema.sql   # bash/git-bash
python scripts/import_seed.py
```

On Windows PowerShell, `<` redirection isn't supported — load the schema with:

```powershell
Get-Content db\schema.sql -Raw | docker compose exec -T db psql -U airiskwatch -d airiskwatch
```

> The compose project name is pinned to `airiskwatch` in `docker-compose.yml` so the
> seeded `airiskwatch_pgdata` volume keeps working now that the compose file lives in
> `backend/` (Compose otherwise derives the project name from the folder name).

Run the API:

```bash
uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`. Interactive docs (Swagger UI) are served at
`http://127.0.0.1:8000/docs`. See [`backend/README.md`](backend/README.md) for
architecture and API reference.

## Frontend setup

All commands below run from `frontend/`.

```bash
cp .env.example .env        # set VITE_API_BASE_URL, e.g. http://127.0.0.1:8000
npm install
npm run dev
```

The dev server prints its local URL (Vite default: `http://127.0.0.1:5173`). It expects
the backend API to be running and reachable at `VITE_API_BASE_URL`.

See [`frontend/docs/`](frontend/docs/README.md) for the frontend's architecture,
conventions, and project structure.
