# CLAUDE.md

Guidance for Claude Code in this repository: commands, environment gotchas,
and the rules that are easy to break. Backend layering is described in
`backend/docs/architecture.md`; frontend conventions are in `frontend/docs/`.

## Commands

### Backend (run from `backend/`, Windows venv)

The database is **Neon** (hosted Postgres + pgvector), reached through
`DATABASE_URL` in `backend/.env`. `docker-compose.yml` is the old local setup
and is no longer used.

```powershell
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/apply_migrations.py            # db/migrations/*.sql, idempotent
python scripts/import_seed.py                 # (re)load the MIT seed corpus
python scripts/backfill_embeddings.py         # local model, no API key; safe to re-run
uvicorn app.main:app --reload                 # http://127.0.0.1:8000, /docs, /health
python scripts/create_admin.py --email you@example.com   # create or promote an admin
```

Classification (spends LLM quota):

```powershell
python scripts/run_classification.py --mode eval --limit 5 --run-name smoke
python scripts/run_classification.py --mode backfill
```

Ingestion, cheapest first. Only `--check-sources` and `--dry-run` are
write-free; a full run commits incidents/reports directly to the database:

```powershell
python scripts/run_ingestion.py --check-sources       # no LLM, no DB writes
python scripts/run_ingestion.py --dry-run             # relevance verdicts only, no writes
python scripts/run_ingestion.py --source wired -v     # full run, one source
```

Ad-hoc SQL: use the Neon console's SQL editor, or `psql "$env:DATABASE_URL"`
if psql is installed. PowerShell has no `<` redirection, so pipe files in with
`Get-Content file.sql -Raw | psql "$env:DATABASE_URL"`.

### Frontend (run from `frontend/`)

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # tsc -b && vite build; this is the only type-check
```

There is no `lint` script, no ESLint config, and no test runner in either
package, even where `frontend/docs/08-tooling-and-config.md` describes one.
Don't claim tests or lint passed; verify with `npm run build` and
`python -m py_compile` / an import check instead.

Both packages need `.env` copied from `.env.example`.

## Gotchas

- `scripts/apply_migrations.py` uses `DATABASE_URL` (Neon), but
  `scripts/import_seed.py` still connects with the `POSTGRES_*` variables,
  which point at the old local Docker database. Fix it before re-seeding Neon.
- Keep `DATABASE_URL` on Neon's **direct** endpoint, not the `-pooler` one. The
  ingestion advisory lock is session-level and breaks under PgBouncer
  transaction pooling. The engine uses `pool_pre_ping` because Neon closes
  connections when idle compute suspends.
- Importing `app.main` loads the sentence-transformers model and takes minutes
  on a cold start; run import checks in the background.
- A schema change needs a new idempotent file in `db/migrations/` as well as
  `db/schema.sql`, then the model/schema/service/frontend chain from
  `AGENTS.md`.
- The backend uses no repository layer, although `backend/docs/` describes one
  as optional. Services query SQLAlchemy models directly; routes inject them
  through a `get_<resource>_service` `Depends` factory.
- Auth (Phase 5, `phase5.md`): email/password and Google sign-in issue a
  Bearer JWT that the frontend keeps in localStorage (`airiskwatch-auth`, read
  only by `AuthContext` and `apiClient`). The site stays public; only
  `/account` and `/digest/*` (`ProtectedRoute`) and `/admin/*` (`AdminRoute`)
  are guarded.
  Backend guards are `get_current_user` / `require_admin` in
  `app/routes/auth_dependencies.py`. They reload the user on every request, so
  role and deactivation changes apply at once. `/api/digest/*` needs a
  signed-in user; `/api/admin/*` and `POST /api/ingestion/run` are admin-only. Admins are made with
  `scripts/create_admin.py`, never through the API.
- The users table is `"user"`, which is a reserved word. Raw SQL must
  double-quote it: unquoted, `SELECT * FROM user` silently returns the current
  role instead of the table.
- Google sign-in needs the same OAuth Web client ID in `GOOGLE_CLIENT_ID`
  (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend). Without it the Google
  button is hidden and `/api/auth/google` returns 401.
- Monthly digest (`digest_service.py`, `digest_email_service.py`): there is
  no digest table; months are queried live. An incident's digest month is its
  earliest linked `report.published_date` (falling back to `incident_date`),
  not `incident_date`. `digest_delivery` holds one row per user (overwritten
  each month) and its atomic claim upsert is what prevents duplicate sends.
  Sending needs the `SMTP_*` keys; the cron (`DIGEST_EMAIL_ENABLED`) shares
  the ingestion scheduler and has the same single-worker caveat.
- All LLM prompts, the MIT taxonomy definitions, and the few-shot examples
  are files in `backend/app/prompts/` (see its README), not strings in code.
  `mit_taxonomy.py` derives the allowed labels from `taxonomy.json`, so a
  renamed subdomain there changes validation too.
- Only the MIT taxonomy data is in scope. CSET/GMF classifications, the
  mitigation crosswalk, and entity-graph data are deferred; don't assume
  models or routes exist for them.

## Ingestion invariants (`app/services/ingestion_service.py`)

- **All outbound HTTP goes through `app/core/news_client.py`** (robots.txt,
  identifying user agent, timeout, politeness delay, cached robots.txt). Never
  call `RobotFileParser.read()`; it fetches on its own. Site scrapers
  (`wired_scraper.py`, `dailystar_scraper.py`, `cnn_scraper.py`) must stay pure HTML-to-data
  functions (`parse_listing`, `parse_article`), registered in
  `news_client._SCRAPERS`.
- **Discovery is listing-page scraping, not RSS.** Each `NewsSource` has a
  `listing_url`; only articles whose page-reported publish time is within
  `INGESTION_LOOKBACK_HOURS` (default 24) are kept. `newest_first=True` lets
  discovery stop at the first stale article (Daily Star sorts by node ID);
  Wired listings aren't ordered, and CNN URLs carry only the date, so both
  fetch up to the per-source cap.
- **The advisory lock is load-bearing.** `incident_id` / `report_number` are
  allocated as `MAX + 1`, which is safe only under the lock, and the lock must
  be taken and released on the same dedicated connection.
- **The LLM never supplies provenance.** `url`, `source_domain`, and
  `published_date` come from the scraped page; an article with no
  parseable date is skipped.
- Deduplication is by exact URL first, then by embedding similarity of the
  LLM-normalized incident (`resolve_incident`, threshold
  `INGESTION_SIMILARITY_THRESHOLD`). Stored incident embeddings must be built
  with `incident_embedding_input(title, description)` so both sides match.
- The scheduler runs inside the API process (`INGESTION_ENABLED`, off by
  default). Run uvicorn with one worker, since each worker starts its own.

## Design rationale

Read before inferring intent from code when behaviour looks surprising:
`phase2.md` (classification), `phase4.md` (ingestion), and the spec/design
decision documents in `backend/MIT_AI_RISK_REPOSITORY/`
(`AIRiskWatch_Spec_And_Plan.md`, `AIRiskWatch_Design_Decisions_*.md`).
