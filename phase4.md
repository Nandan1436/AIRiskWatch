# News-scraping ingestion pipeline (Phase 4+7 merged, per Aug-1 decisions)

> **Status: implemented** on branch `feat-create-scraping-module`.
> See "Implementation notes" at the end for the four things that changed once
> this met real feeds.

## Context

Spec order (`AIRiskWatch_Spec_And_Plan.md` §9) puts Phase 4 (dedup) before Phase 7
(live scraper). But `AIRiskWatch_Design_Decisions_2026-08-01.md` §1 already
superseded that split: it defines one 5-stage daily ingestion pipeline (scrape →
LLM relevance filter → LLM structured extraction → embedding-only dedup/resolution
→ conditional LLM classification), explicitly drops Phase 7's admin panel/review
queue (fully automatic, no human gate), and simplifies dedup to a plain cosine-
similarity threshold reusing the embedding model already shipped for Phase 3
search. The current branch (`feat-news-scraping-module`) matches that merged
pipeline. This plan implements it.

**Compliance constraints (from user), baked into the design, not bolted on:**
- Only poll sources with an official public RSS/Atom feed (that's what feeds are
  for — no ToS ambiguity the way scraping rendered article HTML would carry).
- Check `robots.txt` before every fetch (feed URL and, if ever added, article
  pages). **Fetched ourselves, not via `RobotFileParser.read()`** — `.read()`
  makes its own uncontrolled HTTP request with Python's default user agent,
  which defeats the point of sending an identifying UA. Instead: our client
  GETs `/robots.txt` with our own UA + timeout, feeds the response text into
  `RobotFileParser.parse(lines)`, then calls `can_fetch`. Every check is logged
  (`source=... url=... allowed=...`) so verification can show it actually ran.
- Send a real, identifying `User-Agent` on every request (feed fetch and robots
  fetch alike) — never spoof a browser.
- **`feedparser` never performs the HTTP request itself.** We GET the feed URL
  ourselves (own UA, timeout, status-code check — a 404/403 is a source
  failure, not "zero entries") and pass the response bytes to
  `feedparser.parse(...)`. This is what makes the UA/robots/delay requirements
  actually apply to the request that happens, instead of being bypassed by a
  library doing its own fetch underneath.
- Sequential fetching with a politeness delay between requests; a per-source cap
  on articles processed per run.
- **`report.text` stores the full article body**, per explicit user
  requirement — not just the RSS summary. This means the pipeline fetches the
  article page itself (one additional GET per candidate article, after the
  feed-level fetch), not only the feed. That fetch gets the same treatment as
  every other request in this design: `robots.txt` is checked for the article
  URL specifically (not just the feed URL) before fetching, our own
  identifying `User-Agent` is sent, and it's subject to the same politeness
  delay and per-source cap. **This is a real increase in legal exposure over a
  summary-only design** — storing full article text is mirroring copyrighted
  content, and feeds' own usage terms (e.g. TechCrunch's RSS Terms of Use)
  generally license the feed/summary, not a license to scrape and store the
  full page. Named explicitly here rather than downplayed: this is a
  deliberate user tradeoff, not a compliance-by-design choice. The mitigations
  still in place are: RSS-only source discovery (no crawling beyond
  feed-listed URLs), robots.txt honored per-article, attribution
  (`url`/`source_domain`/`authors`) always retained, and no public
  redistribution of the stored text beyond this app's own UI. If the
  extracted article HTML doesn't cleanly separate body text (paywalled or
  JS-rendered pages), the pipeline falls back to the RSS summary for that
  article and logs it — this is a per-article degradation, not a source
  failure.
- Google News was considered and rejected: it has no public, documented feed/API
  contract for this use (the well-known "RSS" endpoints are undocumented and
  against Google's ToS to scrape), and as an aggregator it would make
  `source_domain` misleading. Going straight to outlets with real public feeds
  avoids that entirely.

## Starter sources (`app/core/news_sources.py`)

Plain Python data, **not a DB table** — it's a small, static, curated list with
no admin UI to edit it through, so a table would just be config wearing a
database costume. A simple `NamedTuple`/dataclass list, still gated by the
relevance filter per article:
- TechCrunch — AI category feed
- Ars Technica — AI tag feed
- VentureBeat — AI category feed
- The Verge — AI/artificial-intelligence feed
- MIT Technology Review — AI topic feed

Each entry is `NewsSource(name, feed_url, domain)`. Feed URLs get a live
sanity-check during implementation (a quick manual `fetch_feed_entries` run
against each, confirming a real entry count) rather than being trusted as
written — outlets occasionally change these, and a wrong URL should surface as
a loud per-source failure in the run log and the returned run summary's
`errors` list, never as a silent "0 entries."

## Data model — **no schema changes at all, no migration**

This feature adds **zero** new tables and **zero** new migrations. Everything it
writes goes into the existing `incident` / `report` / `incident_report` /
`mit_classification` tables. There is no `003_*.sql`; `db/schema.sql` is
untouched; `scripts/apply_migrations.py` doesn't need to be run for this phase.

**No scraped-article table.** Every article that survives the relevance filter
is written directly into the existing `report` table (`report.text` holds the
full article body — see Compliance constraints above). A relevance-rejected
article is discarded outright, matching the design doc's own wording ("discard
on no") — it never touches the database at all.

**No `ingestion_run` table.** An earlier version of this plan proposed one for
run history/observability; that's dropped per explicit user decision. Run
outcomes are reported two ways instead, neither of which needs storage:
- **Logs** — the run's counts and per-source/per-article failures are emitted
  through the standard logger as the cycle proceeds (`run: source=... seen=...
  relevant=... failed=... incidents_created=... reports_attached=...`), so a
  scheduled run's history lives in the app/container log like any other
  background job.
- **The return value** — `run_ingestion_cycle` returns an in-memory
  `IngestionRunSummary` dataclass (`status`, `sources_processed`,
  `articles_seen`, `articles_relevant`, `articles_failed`,
  `incidents_created`, `reports_attached`, `errors: list[str]`) that the manual
  endpoint serializes straight back to the caller. Same information the table
  would have held, for the one caller that actually reads it, without
  persisting it.

The tradeoff, stated plainly: there is **no queryable run history** — you can't
ask the DB "how did last Tuesday's run go," only grep the logs, and a
`GET /api/ingestion/runs` history endpoint is therefore not possible (it's
dropped from the route list below). Accepted deliberately: this phase has no
admin panel to display such history in anyway, since that was already
descoped.

**Idempotency needs no schema change either.** Checked live against the DB
(`SELECT COUNT(*), COUNT(url), COUNT(DISTINCT url) FROM report` → 7143 / 6344 /
6284), confirming 60 duplicate `url` values already exist in the seeded AIID
data — so a `UNIQUE` constraint on `report.url` isn't viable regardless.
Duplicate-skipping is an application-level check instead (`SELECT 1 FROM report
WHERE url = :url` before insert, in `discover_articles`).

**New ids without sequences.** `report.report_number` and `incident.incident_id`
are manually-numbered integers in the seed data with no server default, and the
earlier plan created two Postgres sequences (`setval`-seeded) to allocate new
ones — that DDL is also gone. The ingestion service instead allocates
`SELECT COALESCE(MAX(report_number), 0) + 1 FROM report` (same for
`incident_id`) at insert time. This is only safe because the whole cycle already
runs inside the **Postgres advisory lock** described under Orchestration below,
which guarantees a single ingestion cycle at a time — so the read-then-insert
can't interleave with another cycle's. Worth being explicit that this is the
load-bearing reason the lock exists now, not just an anti-double-work nicety:
if the lock is ever removed, these `MAX()+1` allocations become a race and must
go back to sequences.

**No new SQLAlchemy model** — with `ingestion_run` gone, there's no
`app/models/ingestion_model.py`. Only existing `Incident`/`Report` models are
used.

## Backend logic

**`app/core/feed_client.py`** (new, alongside `llm_client.py`/`embedding_client.py`)
— owns every outbound HTTP request the pipeline makes, so UA/robots/timeout/
delay are actually enforced rather than delegated to a library:
- `is_allowed_by_robots(url, user_agent) -> bool` — GETs `{scheme}://{host}/robots.txt`
  ourselves (our UA, a timeout, treating fetch failure as "allow" per
  convention), parses the response text with `RobotFileParser.parse(lines)`
  (never `.read()`), calls `can_fetch`. Logs `source=... url=... allowed=...`
  for every check.
- `fetch_feed(source: NewsSource) -> bytes` — checks robots for the feed URL,
  sleeps `INGESTION_REQUEST_DELAY_S`, GETs the feed URL with our UA + timeout,
  raises on non-2xx (a 404/403 is a loud source failure, not an empty feed),
  returns the raw response bytes.
- `parse_feed_entries(raw: bytes) -> list[FeedEntry]` — hands those bytes to
  `feedparser.parse(...)` (new dep); `feedparser` only ever parses bytes we
  already fetched, it never makes its own request.
- `fetch_article(url: str) -> bytes | None` — the new per-article fetch:
  checks robots for the **article URL** (separately from the feed-level
  check), sleeps `INGESTION_REQUEST_DELAY_S`, GETs the article page with our
  UA + timeout. Returns `None` (not a raised error) on robots-disallow,
  non-2xx, or timeout — a single article's page being unfetchable is a
  per-article degradation (falls back to the RSS summary in Stage 3), not a
  source-level failure worth aborting the source over.
- `extract_article_text(html: bytes) -> str | None` — pulls the main body text
  out of the fetched article HTML (new dep: `trafilatura` or `readability-lxml`
  — a battle-tested extractor rather than hand-rolled tag-stripping, since
  every outlet's markup differs). Returns `None` if extraction yields nothing
  usable (paywall interstitial, JS-rendered shell) so Stage 3 knows to fall
  back to the summary.

**`app/services/ingestion_service.py`** (new) — the pipeline stages, one
function per stage so each is independently testable, plus an orchestrator:
- **Stage 1 — Discover** `discover_articles(db, source)`:
  `feed_client.fetch_feed` + `parse_feed_entries`, then skips any entry whose
  URL already exists in `report` (`SELECT 1 FROM report WHERE url = :url`),
  capped at `INGESTION_MAX_ARTICLES_PER_SOURCE` new entries. A feed-level fetch
  failure (bad URL, robots-denied, non-2xx) is caught here and reported as a
  source failure, not raised through to kill the run.
- **Stage 2 — Relevance filter** `filter_relevance(client, article)` — LLM
  call #1: yes/no "does this describe a real AI incident?" via
  `create_llm_client()` (`app/core/llm_client.py:251`, already multi-provider).
- **Stage 3 — Report extraction** `extract_report_fields(client, article)` —
  first calls `feed_client.fetch_article(article.url)` +
  `extract_article_text(...)` to get the full body; if either returns `None`
  (robots-disallowed, fetch failure, or extraction failure), falls back to the
  RSS entry's own summary/description field, HTML-stripped, and logs the
  degradation (`source=... url=... fallback=summary`). Whichever text was
  obtained is then passed to the LLM (call #2) for the remaining prose fields
  with a bounded response schema and **trust boundary**: the LLM extracts
  `authors`/`language` (and cleans/normalizes the body text if needed); `url`
  and `source_domain` are taken from the feed entry itself
  (`urlparse(article.url).hostname`), never from the model output. `report.text`
  stores the full extracted body (or the summary fallback) — not truncated —
  per the compliance-constraints note on full-text storage above.
- **Stage 4 — Incident resolution** `resolve_incident(db, report_fields)` —
  embedding-only, **no LLM call**: embed via `embed_text()`
  (`app/core/embedding_client.py:32`), cosine-search against `Incident.embedding`
  using the exact same distance convention `SearchService.retrieve` already
  uses (`app/services/search_service.py:46-60` — `cosine_distance`, report
  `1 - distance` as similarity) so the configured threshold means the same
  thing in both places. Branch A (similarity ≥ `INGESTION_SIMILARITY_THRESHOLD`)
  attaches the report to the existing incident; branch B (no match) proceeds.
  `0.85` is a starting heuristic to tune later against manually-inspected
  pairs, not a validated constant.
- **Stage 5 — New-incident extraction + classification** (branch B only) —
  LLM call #2b (`extract_incident_fields`): title, description, incident_date,
  alleged_deployer[], alleged_developer[], harmed_parties[]. Inserts incident +
  report + `incident_report` link and **commits**, then separately calls
  `LlmClassificationService(db, client).classify_incident(incident_id)` +
  `.save_llm_classification(...)` (`app/services/llm_classification_service.py:276,314`
  — reused as-is, per the design doc's explicit instruction not to duplicate
  classification logic). Classification failure is caught, logged, and counted
  on the returned summary, but does **not** roll back the already-committed
  incident/report — a newly discovered incident missing its classification is
  preferable to losing it outright; it can be backfilled later by the existing
  `scripts/run_classification.py`.
- **Orchestration** `run_ingestion_cycle(db) -> IngestionRunSummary` — loops
  sources → stages 1–5, wrapped in a **Postgres advisory lock**
  (`pg_try_advisory_lock`/`pg_advisory_unlock`) so an overlapping manual trigger
  and scheduled run (or accidentally running multiple app workers) can't
  execute two ingestion cycles at once; if the lock is already held, the call
  returns immediately with `status='skipped'` rather than blocking or racing.
  This lock is also what makes the `MAX(id)+1` allocation described in the Data
  model section safe, so it is not optional. Catches and logs per-article *and*
  per-source errors without aborting the whole cycle, accumulating them into the
  returned summary's `articles_failed` count and `errors` list; `status` is one
  of `completed`/`partial`/`failed`/`skipped` (`partial` covers the normal case
  of continuing past individual article/source failures). Nothing about the run
  itself is persisted — the summary is returned and logged, not stored.

**`scripts/run_ingestion.py`** (new, same shape as `scripts/run_classification.py`)
— CLI entry point calling `run_ingestion_cycle`, for manual runs / OS-level cron,
independent of whether the in-process scheduler is enabled.

**Scheduler wiring in `app/main.py`** — replace the current bare
`FastAPI(...)` construction with a `lifespan` context manager: on startup, if
`config.INGESTION_ENABLED`, start an APScheduler `BackgroundScheduler` (new
dep) with a `CronTrigger(hour=config.INGESTION_CRON_HOUR, timezone=config.INGESTION_TIMEZONE)`
job calling `run_ingestion_cycle` (opens its own DB session, since it runs
outside request scope); shut the scheduler down on app shutdown
(`scheduler.shutdown(wait=True)`). Timezone is **explicit**, not left to
process/container default (`INGESTION_TIMEZONE`, default `Asia/Dhaka`) — an
unqualified hour is ambiguous across a containerized deploy. Defaults to
**disabled** (`INGESTION_ENABLED=false`) so nobody starts hitting real feeds +
burning LLM quota just by starting the server. Documented in `.env.example`
with an explicit caveat: **safe only with a single app worker**
(`uvicorn ... ` without `--workers N>1`) unless/until a distributed lock beyond
the advisory-lock-per-run-call is added — running N workers would start N
in-process schedulers all racing for the same advisory lock at the same
minute, which the lock prevents from double-*running* but still wastes
N-1 wake-ups. The existing `uvicorn app.main:app --reload` dev command is
already single-worker, so this is a documentation note, not a code change.

**Manual override endpoint** (`app/routes/ingestion_route.py`, new) — per the
design doc's "cron is the backbone, manual is the override" (§8.8), and since
there's no admin panel to click a button in: a single route,
`POST /api/ingestion/run`. Runs one cycle synchronously through the same
advisory-locked `run_ingestion_cycle` (bounded by the per-source cap, so this is
fine without a job queue) and returns that call's `IngestionRunSummary`
serialized via a new Pydantic schema in `app/schemas/ingestion_schema.py` —
`status`, `sources_processed`, `articles_seen`, `articles_relevant`,
`articles_failed`, `incidents_created`, `reports_attached`, `errors` — not just
a bare success flag. Follows the existing thin-route-injects-service pattern
(`app/services/risk_domain_service.py` style, `get_<resource>_service`
`Depends` factory). There is **no** `GET /api/ingestion/runs` — with no
`ingestion_run` table there's no history to serve; past runs are found in the
logs.

**Config additions in `app/config.py`**: `INGESTION_ENABLED` (default `false`),
`INGESTION_CRON_HOUR` (default `3`), `INGESTION_TIMEZONE` (default
`Asia/Dhaka`), `INGESTION_MAX_ARTICLES_PER_SOURCE` (default `20`),
`INGESTION_SIMILARITY_THRESHOLD` (default `0.85`, documented as a tunable
starting heuristic, not a validated constant), `INGESTION_USER_AGENT`,
`INGESTION_REQUEST_DELAY_S` (default `2.0`). Mirrored into `.env.example`.

**`requirements.txt`**: add `feedparser`, `apscheduler`, `trafilatura` (article
body extraction).

No frontend changes — new incidents/reports flow through the existing
Explorer/Search UI automatically since nothing about their shape is new.

## Verification

1. Confirm the schema is genuinely untouched: `git status` shows no change under
   `backend/db/`, and the app starts against the existing seeded DB with no
   migration step. Then confirm id allocation works — after one ingestion run,
   check the new `report.report_number` / `incident.incident_id` values are
   exactly `previous MAX + 1` and that no `UNIQUE` violation occurred.
2. Sanity-check each of the 5 feed URLs individually (`fetch_feed` +
   `parse_feed_entries`) and confirm a real entry count for each — fix any
   stale URL before wiring the full pipeline.
3. Run `python scripts/run_ingestion.py --once` with a real `GEMINI_API_KEY`:
   confirm robots.txt is actually consulted for both feed URLs *and* article
   URLs (log line per check), irrelevant articles are discarded with no
   `report` row, relevant ones produce a `report` row with the **full article
   body** in `text` (not just a short summary) and either attach to an
   existing incident (branch A, no incident-extraction/classification calls)
   or create a new classified incident (branch B). Spot-check a couple of
   `report.text` values against the live article pages to confirm real body
   text was captured, not boilerplate/nav chrome.
3b. Point at one article behind a paywall or with heavy JS rendering; confirm
    `extract_article_text` returns `None`, the pipeline falls back to the RSS
    summary for that article, and the fallback is logged rather than silently
    swallowed.
4. Re-run immediately: confirm the same feed entries are skipped (already
   present by `url` in `report`) — no duplicate LLM calls or rows.
5. **Failure paths**: point one source at a bad URL (or block it in
   `robots.txt` via a local test) and confirm the run still returns
   `status='partial'` with the other sources processed and the failure
   reflected in the summary's `articles_failed`/`errors` and in the logs, not
   an aborted run.
6. **Concurrency**: fire `POST /api/ingestion/run` twice back-to-back (or
   overlap it with a scheduler tick) and confirm the second call returns
   `status='skipped'` via the advisory lock instead of running a second cycle —
   this also protects the `MAX(id)+1` allocation, so it's worth confirming
   directly rather than assuming.
7. Hit `POST /api/ingestion/run` via `/docs`; confirm the response body includes
   the full count breakdown and `errors` list, not just success/fail.
8. Confirm a newly created incident shows up in the existing frontend Explorer
   and Search (`npm run dev`) with no frontend code changes.
9. Toggle `INGESTION_ENABLED=true`, restart the server (single worker), confirm
   the scheduler starts with the configured timezone (log line) and shuts down
   cleanly on Ctrl-C.

## Implementation notes

Built as planned — no new tables, no migration, `db/schema.sql` untouched. Four
things only became visible once the pipeline ran against real feeds and a real
LLM, and all four changed the code rather than the plan.

**1. Stage ordering was wrong for dedup.** The plan had Stage 4 (resolution)
before Stage 5 (incident extraction), resolving on the article's own headline
and body. But stored `incident.embedding` vectors are built from an incident's
LLM-written title + description, so that comparison is asymmetric — raw
journalism against normalized records. It ingested the same Flock
license-plate-reader incident twice from two MIT Technology Review articles.
Measured on that pair: **0.8244** raw (below threshold → duplicate created) vs
**0.8986** normalized (matches). Next-best candidates were 0.5374 and 0.4917, so
`0.85` sits in a wide gap and looks like a reasonable default after all. Fixed by
extracting incident fields *first*, then resolving in normalized space — which
costs one LLM call on the attach path the planned ordering would have saved.
Branch A verified afterwards at 0.9104 similarity, attaching with no duplicate.

**2. A latent bug in `llm_client.py` blocked Stage 3 entirely.**
`_strip_unsupported` recursed blindly and deleted any key named `title`,
including a *property* named `title` — while leaving it in `required`. Gemini
rejected the request (`required[0]: property is not defined`). Phase 2's schemas
have no `title` field, so this had never fired. Fixed there rather than worked
around here, and confirmed the Phase 2 classification schema is unchanged.

**3. The audit logging was invisible under uvicorn.** Uvicorn configures only
its own loggers, so the root logger stayed at `WARNING` and every robots.txt
decision and summary-fallback line was dropped — logging that only has value if
someone can actually read it. `app/main.py` now configures logging when nothing
else has, and quiets `httpx`'s per-request INFO chatter.

**4. One planned feed URL was wrong, and `lxml_html_clean` was missing.**
The Verge's AI feed is `/rss/ai-artificial-intelligence/index.xml` (the planned
path had the segments transposed and returned 0 entries). `--check-feeds` exists
precisely to catch that, and did. Separately, `trafilatura` fails to import
without `lxml_html_clean`, because its `justext` dependency still imports
`lxml.html.clean` after that moved into its own package — now pinned in
`requirements.txt`.

### Relevance filter — the prompt, and how strict it turned out

The gate is the part that most needed real-world tuning, because an AI-category
feed is overwhelmingly funding rounds and product launches, and a model asked
"is this about AI?" says yes to nearly all of it. What the prompt does:

- Requires **all three** of a deployed system, a harm that already occurred, and
  identifiable affected parties.
- **Enumerates** the exclusions rather than trusting judgment: funding,
  acquisitions, launches (including AI-*safety* product launches), benchmarks,
  human-carried security exploits against AI products, red-team demos,
  retrospectives about earlier incidents, op-eds, policy proposals, explainers.
- Demands the model **name** the harm and the system, and grounds both in the
  supplied text — an earlier version conflated systems across adjacent feed
  entries, reporting an `ai_system` that belonged to a different article.
- Returns a confidence that is thresholded (`INGESTION_RELEVANCE_MIN_CONFIDENCE`,
  default `0.6`); a hedged yes, or a yes that can't name harm + system, is
  treated as a no. A false positive corrupts the corpus; a false negative just
  misses one article.

Observed on live feeds: **1/20** accepted on TechCrunch, **1/20** on Ars
Technica, **0/10** on The Verge. The accepted items were genuine incidents (Grok
used to generate explicit imagery from a child's photo; a credential leak via
LiteLLM). Correct borderline rejections included "Amazon is destroying rare books
to train AI" (a training-data practice, no deployed harm to identifiable
parties) and a Copilot jailbreak found by researchers in testing.

The known cost of "discard on no": rejected articles aren't persisted, so each
run re-screens them — a second run over the same feed spent 19 relevance calls
to accept nothing. Correct, but not free; a URL-level seen-cache would fix it
without a table if that ever matters.
