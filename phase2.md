# Phase 2 — LLM Classification + Evaluation Harness

## Context

Phase 1 (read-only API + explorer UI) is done. Phase 2 per the spec (`AIRiskWatch_Spec_And_Plan.md` §8.3, §9): an LLM-based MIT-taxonomy classifier with strict JSON output + an evaluation harness (feature F11) measured against the human-labelled gold set, **then** backfill of the unclassified incidents — in that order, and only if the eval scores justify it.

**Why LLM few-shot, not a trained model** (settled): only 1,242 incident-level labels exist; the 21 subdomains have a severe long tail (12 of 21 have <20 examples, 7 have ≤4) — untrainable. The 1,242 labels are worth far more as a held-out gold eval set. The spec itself prescribes "LLM not trained classifiers" with few-shot prompt iteration. Future taxonomies (CSET/GMF) = new prompt + schema per taxonomy in the same classifier function, not new models.

**Budget = $0. Machine = 8GB RAM / 2-core i5-7200U / 2GB 940MX** → local inference not viable for the real batch. Providers:

- **Primary: Google Gemini free tier**, a current flash-lite model (highest free daily cap, native JSON-schema output). **Update 2026-07-28:** `gemini-2.5-flash-lite` and `gemini-2.5-flash` are now **closed to new API keys** (404 "no longer available to new users"). Verified-working replacement and current default: **`gemini-3.5-flash-lite`** (`gemini-flash-lite-latest` also works as a moving alias). Confirmed end-to-end against the live API.
- **Second provider: Mistral free "Experiment" tier**, `mistral-small-latest` (2 RPM but ~1B tokens/month — full batch in one ~13h overnight run)
- **Fallback/smoke tests: Groq free tier**, `llama-3.3-70b-versatile` (100K tokens/day cap → ~25 classifications/day, batch-unusable)
- **Optional comparison for the report: Ollama** `qwen3:4b` on a ~100-incident sample only

See "Model options" below for the full verified comparison.

~1,500 total calls (1,242 eval + 256 backfill); free-tier **daily caps drive the design**: resumable JSONL checkpointing + separation of prediction (spends quota) from scoring (offline, free).

### The two-step workflow: evaluate first, backfill only if the scores hold

This is the spine of the phase. **Prediction and scoring are separate steps**, and evaluation runs entirely **before** — and independently of — any change to the seeded data:

1. **Predict** (`run_classification.py`) — spends LLM quota, writes predictions to a JSONL file. In `--mode eval` this writes **only to disk, never to the DB**.
2. **Score** (`evaluate_classifier.py`) — offline, free, no API calls; reads the JSONL + gold labels and produces the metrics/report. Re-runnable as often as you like.

So the sequence is deliberately: **classify the gold set → score it → look at the numbers → (only then, and only if they're good) backfill the 256 unclassified incidents.** Backfill (`--mode backfill`) is the *only* step that writes classification rows to the database. Nothing about eval touches the seeded corpus — you can iterate the prompt freely and see accuracy/F1/confusion before committing anything.

### Out of scope for Phase 2 (deferred)

Phase 2 runs **only over incidents already in the DB** (the 1,498 seeded via `import_seed.py`). It **reads** an incident's title/description + its already-linked reports, and **writes only `mit_classification` rows**. It never creates `incident`, `report`, or `incident_report` rows.

Turning a *new report* into an incident — the scraper, the relevance gate, structured extraction, and the "attach to an existing incident vs. create a new one" decision — is deliberately later work, split across two spec phases:

- **Spec Phase 4** — dedup / entity resolution (§8.4): embed the new report → vector + entity match → LLM adjudication → *attach as a new report on an existing incident* **or** *create a new incident* (borderline → review queue).
- **Spec Phase 7** — live ingestion (§7, §8.2): scraper → relevance gate → structured extraction → wire into Phases 2/4/5 + review queue (F10).

The `classify_incident()` / `save_llm_classification()` core built here is the **reusable piece** those later phases will call once an incident row exists. (The backend is also read-only today — every route is `GET`, the only writer is `scripts/import_seed.py` — so any future ingestion needs new write routes/services/input schemas that don't exist yet, and must respect the business-key FKs: `incident_report` → `incident.incident_id`/`report.report_number`, and no unique constraint on `mit_classification.incident_id`.)

## Model options (verified July 2026)

### Free API options (for the real eval + backfill; batch = ~1,500 calls × ~4–5k tokens)

| Provider / model | Free limits | Full batch takes | Verdict |
|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | 15 RPM, **1,000 req/day** | ~2 days | **Primary pick** — best quality-per-free-call, native JSON-schema output (`responseSchema`), generous token limits |
| Gemini 2.5 Flash | 10 RPM, 250 req/day | ~6 days | Better model, but 250/day hurts; use for a quality spot-check |
| Gemini 3 Flash | reportedly ~1,500 req/day free | ~1 day | If enabled for the AI Studio project, beats everything — check the project's live limits |
| **Mistral Small (La Plateforme "Experiment" tier)** | **2 RPM, ~1B tokens/month** | **~13 hours, one continuous run** | **Dark horse** — no daily request cap; one overnight hands-off run finishes everything. Needs phone verification at signup |
| Groq `llama-3.3-70b-versatile` | 30 RPM, 1K req/day, but **100K tokens/day** | ~25 classifications/day → ~60 days | Token cap kills it for the batch. Smoke-test/fallback only |
| Cerebras `llama-3.3-70b` | 30 RPM, 1M tokens/day, 8K context | ~200–250/day → ~7 days | Workable secondary; the ~5k prompt just fits the 8K context |
| OpenRouter `:free` models | 50 req/day (1,000/day only after one-time $10 top-up) | ~30 days | Not practical while strictly $0 |

**Chosen setup:** a current Gemini flash-lite (`gemini-3.5-flash-lite`, since the 2.5 line is closed to new keys) as `LLM_PROVIDER=gemini` default. **Update (Oct 2026):** Mistral and Ollama were dropped. The second provider is Groq (`LLM_PROVIDER=groq`, one `GROQ_API_KEY`), comparing `openai/gpt-oss-120b` and `qwen/qwen3.8-27b`, the only strong Groq models with strict `json_schema` output. Free tier per model: 8K tokens/min, 200K tokens/day, so about 30 classifications per model per day.

### Ollama options (this machine: 8GB RAM, 2-core i5-7200U, 2GB 940MX)

CPU-only in practice (2GB VRAM can't hold a 3B model's weights + context); expect ~1–3 min per classification. **Only for the optional ~100-incident comparison run, never the full batch.** Anything 7B+ swaps on 8GB RAM with Docker running.

| Model | Size (Q4) | Why |
|---|---|---|
| **`qwen3:4b`** | ~2.6GB | Best small-model instruction following + JSON reliability; the pick |
| `llama3.2:3b` | ~2.0GB | Safe, well-tested baseline; slightly weaker on the 21-way choice |
| `gemma3:4b` | ~3.3GB | Good quality but heaviest — tight next to Postgres in 8GB RAM |
| `phi-4-mini` (3.8B) | ~2.5GB | Strong reasoning for its size; occasionally chatty JSON |

Sources: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [Gemini per-model free tier](https://www.aifreeapi.com/en/posts/gemini-api-rate-limits-per-tier) · [Groq rate limits](https://console.groq.com/docs/rate-limits) · [Mistral tiers](https://docs.mistral.ai/admin/user-management-finops/tier) · [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits) · [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits)

## Data facts (verified)

- 1,498 incidents / 7,143 reports (full article text, median ~3.7k chars) / 1,242 gold MIT classifications, exactly one per incident, incident-level. 256 incidents unclassified.
- Causal axes include a third value **`Other`** in gold data (Entity 9, Timing 8, Intent 17 rows) — enums and eval must include it.
- **Schema gap**: `mit_classification` lacks `confidence`, `classified_by`, `classified_at` (spec wants them). DB is already seeded → idempotent ALTER migration, not reimport.
- No taxonomy-description file exists in the repo — domain/subdomain descriptions must be transcribed into a constants module from the public MIT AI Risk Repository taxonomy (Slattery et al.); strings must exactly match the seed's stripped form.

## Implementation

### 1. Schema/provenance migration

- **`backend/db/migrations/001_add_classification_provenance.sql`** (new): `ALTER TABLE mit_classification ADD COLUMN IF NOT EXISTS confidence REAL, classified_by TEXT, classified_at TIMESTAMPTZ;` then `UPDATE ... SET classified_by='human' WHERE classified_by IS NULL` (seed rows are expert annotations).
- **`backend/scripts/apply_migrations.py`** (new): psycopg2 runner in `import_seed.py` style, executes `db/migrations/*.sql` in order (avoids needing psql on Windows).
- **`backend/db/schema.sql`**: add same 3 columns to the CREATE TABLE for fresh installs.
- **`backend/app/models/mit_classification_model.py`**: map the 3 new columns.
- **`backend/app/schemas/mit_classification_schema.py`**: add `confidence`, `classified_by` to the response → flows automatically into existing incident list/detail endpoints (frontend can badge LLM vs human later).

### 2. Taxonomy module — `backend/app/core/mit_taxonomy.py` (new, + `core/__init__.py`)

- The taxonomy text and the few-shot examples live in `backend/app/prompts/classification/` (`taxonomy.json`, `examples.json`); `mit_taxonomy.py` derives the label lists, `SUBDOMAIN_TO_DOMAIN`, and `FEW_SHOT_INCIDENT_IDS` from them. 7 domains + 21 subdomains with 1–2 sentence descriptions; axis enums incl. `Other`.
- 7 few-shot examples, one gold incident per domain, held out of eval (eval set 1,235). Title and description come from the DB; the example answer uses the gold labels, the first other subdomain of the domain as the second choice, confidence 0.9, and a one-line justification.
- **Tried and reverted (Oct 2026):** 39 examples (two per subdomain, hand-written justifications, subdomain definitions verbatim from the paper's Table 2). On Gemini it scored worse: domain accuracy 76.4% vs 82.4%, and 72.8% vs 77.8% on the 81 incidents both runs share. Equal examples per subdomain over-weighted the rare Socioeconomic domain (precision 0.32). That prompt is kept with its results in `backend/eval_results/gemini_fs39/prompt_files/`.
- Taxonomy-vs-DB string check (flag on the batch script): assert every distinct gold `risk_domain`/`risk_subdomain` string exists in the module — catches transcription typos before burning quota.

### 3. LLM client — `backend/app/core/llm_client.py` (new)

- `LlmClient` protocol: `complete_json(system, user, response_schema) -> dict`. Plain `httpx`, no LangChain/SDKs.
- `GeminiClient` (native REST, `responseMimeType` + `responseSchema`, temperature 0) and `GroqClient` (OpenAI-compatible, strict `json_schema`: the schema is rewritten so every property is required and optional ones are nullable; `reasoning_effort=low`). A 429 that outlasts the retries raises `LlmRateLimitError`, and the batch runner stops so a re-run resumes.
- Shared: client-side RPM pacing, exponential backoff on 429/5xx honoring `Retry-After`, one JSON-repair retry (re-send with the parse/validation error), typed `LlmClientError`.
- `create_llm_client()` factory switching on `LLM_PROVIDER` env var.

### 4. Classification service — `backend/app/services/llm_classification_service.py` (new)

- Pydantic output model: `risk_domain` (Literal 7), `risk_subdomain`, `risk_subdomain_second` (powers top-2 accuracy), `causal_entity`/`timing`/`intent` (Literals incl. `Other`), `confidence` 0–1, `justification` (≤2 sentences). Cross-field validator: subdomain must belong to the chosen domain; violation → one repair retry → fail.
- Input construction: title + description + up to 2 linked reports truncated to ~1,500 chars each (~1.2–2k tokens).
- Prompt (files in `backend/app/prompts/classification/`): system = task + full taxonomy with descriptions + axis definitions + output rules; user = 7 few-shot examples (title + description) with their JSON answers, then the target. About 3.6K tokens.
- `classify_incident(incident_id)` (pure prediction — no DB write) + `save_llm_classification(...)` (INSERT `classified_by='llm'`, `classified_at=now()`, `published=False`; skip if an llm row exists → idempotent). **Only `save_llm_classification` writes; eval never calls it.**

### 5. Config & deps

- **`backend/app/config.py`** + **`.env.example`**: `LLM_PROVIDER` (`gemini` | `groq`), `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-120b` (or `qwen/qwen3.8-27b`), `GROQ_REASONING_EFFORT=low`, `GROQ_MAX_COMPLETION_TOKENS=2048`, `LLM_MAX_RPM=10`, `LLM_TIMEOUT_S=60`.
- **`backend/requirements.txt`**: add `httpx`, `scikit-learn` (metrics only).

### 6. Batch runner — `backend/scripts/run_classification.py` (new, spends quota)

- `--mode eval|backfill` (eval = gold incidents minus few-shot examples, 1,235; backfill = the 256 unclassified), `--provider gemini|groq` and `--model` (override `.env` per run; each prediction records its model), `--limit N`, `--sample N --seed 42` (stratified by domain, floor 10/domain — `--sample 300` gives usable numbers in one day of quota), `--run-name` → `backend/eval_results/<run-name>/predictions.jsonl`.
- **`--mode eval` writes only the JSONL predictions file — no DB write.** `--mode backfill` also writes to the DB via `save_llm_classification`. This is what enforces "evaluate before you touch the data."
- **Resumable**: skip incident_ids already in JSONL (backfill: or already in DB); append each result line immediately. Ctrl-C / 429-exhaustion loses nothing; rerun next day when caps reset.
- Progress line per incident; end summary.

### 7. Eval harness — `backend/scripts/evaluate_classifier.py` (new, free/offline)

- Reads predictions JSONL + gold from DB. Computes: domain accuracy, per-domain P/R/F1+support, macro-F1 (domain and subdomain), 7×7 domain confusion matrix, top-1/top-2 subdomain accuracy, per-axis accuracy, mean confidence correct vs incorrect (calibration paragraph).
- Writes `metrics.json`, `report.md` (paste-ready tables for the SPL report), `subdomain_confusion.csv`.
- Re-scorable without API calls — iterate prompts on a fixed `--sample 200 --seed 1` dev slice; quote headline numbers from a final full run.

## Order (~5–6 days)

1. Migration + ORM + schema response (verify via psql + `GET /api/incidents/{id}`)
2. `mit_taxonomy.py` (transcription is the slow part) + string check + pick 7 exemplars
3. `llm_client.py` + config + sanity call
4. Service + `run_classification.py`; smoke `--mode eval --limit 5`
5. `evaluate_classifier.py`; `--sample 300`, iterate the prompt on the dev slice **watching the eval scores** — no DB writes yet
6. **Full eval run** (hands-off, 1–2 days wall-clock due to caps) → review the metrics/report → **decision gate: only if scores hold, run `--mode backfill`** → verify `SELECT classified_by, count(*) ... GROUP BY 1` → human 1242 / llm 256

The gate at step 6 is the point you asked for: you see the full evaluation numbers before any of the 256 unclassified incidents get an LLM row.

## Verification

1. `apply_migrations.py` twice → second run no-op.
2. Taxonomy check → all 7 domains / 21 gold subdomains matched.
3. Smoke run 5 incidents (`--mode eval --limit 5`) → valid JSONL, subdomain consistent with domain, **and DB unchanged** (`SELECT count(*) FROM mit_classification` before/after is identical); rerun → "5 skipped".
4. Ctrl-C a `--sample 50` run midway, rerun → resumes.
5. Eval outputs exist; confusion matrix rows sum to per-domain support.
6. Only after the eval gate: a backfilled incident's API detail shows `"classified_by": "llm"` + confidence; backfill rerun is a no-op.
7. Sanity ballpark (not a promise): domain accuracy ~70–85%; subdomain macro-F1 notably lower (long tail — discuss in report, don't fight it); top-2 > top-1 by several points.
