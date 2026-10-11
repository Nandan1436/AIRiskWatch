# News-scraping ingestion pipeline (listing-page scraping, previous-day window)

> **Status: implemented in a reduced form (5 Oct 2026).** What shipped differs
> from the plan below: sources are **Wired** (`/tag/artificial-intelligence/`,
> `/category/security/`), **The Daily Star**
> (`/news/technology/artificial-intelligence`) and **CNN**
> (`/business/tech/ai-news-artificial-intelligence-updates`, added 11 Oct);
> BBC is dropped; the window is
> a **rolling `INGESTION_LOOKBACK_HOURS`** (default 24) instead of the previous
> calendar day, so there is no `--date` flag; there is no pagination and no
> `trafilatura` fallback. `feed_client.py` was renamed to `news_client.py` and
> `--check-feeds` to `--check-sources` as planned. CLAUDE.md's "Ingestion
> invariants" describes the shipped code.
>
> **Original plan status: revised, not yet implemented.** The first build on branch
> `feat-create-scraping-module` discovered articles through RSS feeds
> (TechCrunch, Wired, and earlier Ars Technica / The Verge / MIT Technology
> Review). That discovery step is dropped: it routed the pipeline through
> AI-category feeds rather than the outlets' own technology news. This plan
> replaces it with direct scraping of **The Daily Star** and **BBC** technology
> section pages, ingesting only articles **published on the previous calendar
> day**. Stages 2–5, the advisory lock and the run summary carry over unchanged.
> "Implementation notes" at the end records what the RSS-era build learned;
> most of it still applies.

## Context

Spec order (`AIRiskWatch_Spec_And_Plan.md` §9) puts Phase 4 (dedup) before Phase 7
(live scraper). But `AIRiskWatch_Design_Decisions_2026-08-01.md` §1 already
superseded that split: it defines one 5-stage daily ingestion pipeline (scrape →
LLM relevance filter → LLM structured extraction → embedding-only dedup/resolution
→ conditional LLM classification), explicitly drops Phase 7's admin panel/review
queue (fully automatic, no human gate), and simplifies dedup to a plain cosine-
similarity threshold reusing the embedding model already shipped for Phase 3
search. This plan implements that pipeline.

What changes in this revision is only the "scrape" stage. It is now:

1. fetch each source's **technology listing page** (plus up to N pagination
   pages),
2. collect article links from it,
3. fetch each article page and read its **own published timestamp**,
4. keep only articles published **yesterday** (in `INGESTION_TIMEZONE`).

Everything downstream — relevance filter, extraction, resolution,
classification — sees the same kind of input as before, except that it is now
always the full scraped body rather than sometimes an RSS summary.

### Sources as checked live (2026-10-04)

- **The Daily Star** — `https://www.thedailystar.net/tech-startup` now serves the
  section at `/news/technology`. Article URLs look like
  `/news/technology/news/<slug>-<id>`. The listing paginates with `?page=N` and
  shows relative times (`3 HOUR(s)`) for recent items and absolute dates
  (`1 October 2026`) for older ones. It mixes in guides and reviews ("Our top
  recommendations for home espresso machines"), so the relevance filter is still
  doing real work. `robots.txt` disallows only `/admin/`, `/search/`, `/tags/`,
  `/user/register` and Drupal internals (`/core/`, `/profiles/`), so `/news/` is
  allowed. **`/tags/` pages are disallowed and must not be used** as listing
  sources.
- **BBC** — the listing is `https://www.bbc.com/technology`. Its canonical URL
  is that address, and the en-GB alternate is `https://www.bbc.co.uk/news/technology`.
  We use the `bbc.com` one. From a saved copy of the page:
  - It is a server-rendered Next.js page (`data-next-head`, `_next/static`
    chunks), so its HTML should already contain the article links without
    running JavaScript. It probably also embeds a `__NEXT_DATA__` JSON blob. If
    present, that blob is a steadier source of URLs and timestamps than CSS class
    names like `Pagination-styles__...-sc-3094f74e-0`, which are generated hashes
    that change between deploys. Don't use those class names as selectors.
  - It has a pagination component (`Pagination-styles`, `PaginationButton`), but
    the URL scheme for later pages wasn't visible.
  - `<meta name="robots" content="NOODP, NOYDIR">` doesn't restrict crawling, but
    it says nothing about `robots.txt` either.

  Still **unverified**: `robots.txt` (bbc.com couldn't be fetched from the
  planning environment), the article URL shape (expected
  `/news/articles/<id>`; the copy was cut off before any links), and the
  pagination URL. The listing probably also carries video and live pages, which
  the article-path prefix filters out. Confirming these is verification step 1,
  before any other work on the BBC source.

## Compliance constraints

**What changed, stated plainly.** The original design allowed polling only
sources with an official public RSS/Atom feed, so that every request went to an
endpoint published for machine consumption. Dropping that rule is a deliberate
user decision, and it **increases** legal exposure: the pipeline now crawls
rendered HTML listing pages *and* stores full article text, with no feed licence
to point to for either. The mitigations below reduce that exposure but do not
remove it.

Baked into the design, not bolted on:

- **`robots.txt` is checked before every fetch** — every listing page (including
  each `?page=N`) and every article URL. **Fetched ourselves, not via
  `RobotFileParser.read()`**: `.read()` makes its own uncontrolled request with
  Python's default user agent, which defeats the point of sending an identifying
  UA. Our client GETs `/robots.txt` with our own UA + timeout, feeds the text into
  `RobotFileParser.parse(lines)`, then calls `can_fetch`. Every check is logged
  (`url=... allowed=...`) so verification can show it ran.
- A real, identifying `User-Agent` on every request — never a spoofed browser.
- Sequential fetching with a politeness delay between requests, a cap on listing
  pages per source (`INGESTION_MAX_LISTING_PAGES`) and a cap on articles per
  source per run (`INGESTION_MAX_ARTICLES_PER_SOURCE`).
- **Narrow crawl scope.** Only the configured listing URL and its `?page=N`
  pagination are fetched, plus article URLs that are on the source's own domain
  and under its `article_path_prefix`. No link-following beyond that, no sitemap
  walking, no tag/search pages.
- **`report.text` stores the full article body**, per explicit user requirement.
  This is mirroring copyrighted content; it remains a deliberate user tradeoff.
  Attribution (`url`, `source_domain`, `authors`) is always retained, and the
  stored text is not redistributed beyond this app's own UI.
- **BBC caveat.** The BBC has publicly restricted automated harvesting and AI use
  of its content, and its `robots.txt` was not verified while planning. If our UA
  is disallowed for the listing or article paths, the source fails loudly and is
  **removed from `NEWS_SOURCES`**; it is never worked around (no UA changes, no
  alternative URL paths, no mirror sites). Even if `robots.txt` allows it, the
  BBC's terms of use are a separate question that robots.txt does not answer.

## Sources (`app/core/news_sources.py`)

Plain Python data, **not a DB table** — a small, static, curated list with no
admin UI to edit it through. The shape changes from `NewsSource(name, feed_url,
domain)` to:

```python
class NewsSource(NamedTuple):
    name: str
    listing_url: str
    domain: str
    article_path_prefix: str
```

- `The Daily Star Tech` — `https://www.thedailystar.net/news/technology`,
  domain `thedailystar.net`, prefix `/news/technology/`
- `BBC Technology` — `https://www.bbc.com/technology`, domain `bbc.com`, prefix
  `/news/articles/` (prefix to be confirmed, see above)

Both are general technology sections, not AI-only, so every article is still
gated by the relevance filter. Listing URLs get a live sanity-check
(`--check-sources`) rather than being trusted as written; a wrong URL must
surface as a loud per-source failure in the run log and the summary's `errors`
list, never as a silent "0 candidates".

## Data model — no schema changes at all, no migration

Unchanged from the first build. This feature adds **zero** new tables and **zero**
new migrations. Everything it writes goes into the existing `incident` /
`report` / `incident_report` / `mit_classification` tables; `db/schema.sql` is
untouched.

**No scraped-article table.** An article that survives the relevance filter is
written straight into `report`. A relevance-rejected article is discarded
outright ("discard on no") and never touches the database.

**No `ingestion_run` table.** Run outcomes are reported through logs
(`run: source=... seen=... relevant=... failed=... incidents_created=...
reports_attached=...`) and through the in-memory `IngestionRunSummary` returned
by `run_ingestion_cycle` and serialized by the manual endpoint. There is no
queryable run history; past runs live in the logs.

**Idempotency needs no schema change.** The seeded data already holds 60
duplicate `report.url` values (7143 / 6344 / 6284 for `COUNT(*)`, `COUNT(url)`,
`COUNT(DISTINCT url)`), so a `UNIQUE` constraint isn't viable. Duplicate-skipping
is an application-level `SELECT 1 FROM report WHERE url = :url` in Stage 1.

**New ids without sequences.** `report_number` / `incident_id` are allocated as
`COALESCE(MAX(...), 0) + 1`, which is safe **only** because the whole cycle runs
under the Postgres advisory lock (see Orchestration). If the lock is ever
removed, these must go back to sequences.

**`published_date` provenance.** It now comes from the article page's own
metadata (JSON-LD / meta tags, parsed by the site scraper), not from a feed
entry. It still never comes from the LLM.

## Backend logic

**`app/core/news_client.py`** (renamed from `feed_client.py`, since it no longer
touches feeds) — still owns **every** outbound HTTP request the pipeline makes:

- `is_allowed_by_robots(url) -> bool` — unchanged.
- `fetch_listing(url) -> bytes` — robots check, politeness delay, GET with our
  UA + timeout. **Raises** on robots-disallow or non-2xx: a listing page that
  can't be fetched is a source failure, not "no articles today".
- `fetch_article(url) -> bytes | None` — unchanged: returns `None` on
  robots-disallow, non-2xx or timeout (a per-article skip, not a source failure).
- `parse_feed_entries` and the `feedparser` dependency are removed.

**Site scrapers** — `app/core/dailystar_scraper.py` and
`app/core/bbc_scraper.py`, replacing `techcrunch_scraper.py` and
`wired_scraper.py` (whose `backend/*_rss_scrape_check.json` outputs are deleted
too). They stay **pure HTML-to-text functions**: no HTTP, no DB. Each exposes:

- `parse_listing(html, base_url) -> list[ListingItem]` where
  `ListingItem(url, title, listed_at: datetime | None)`. Keeps only links on the
  source's domain under its `article_path_prefix`, canonicalized (absolute,
  query and fragment stripped), de-duplicated in page order. `listed_at` is
  parsed when the listing shows an absolute date or a relative time
  (`3 HOUR(s)`, `2 hrs ago`), else `None`.
- `next_page_url(base_url, page)` — `?page=N` for the Daily Star. The BBC page
  does have pagination, but its URL scheme still has to be read from the live
  HTML in step 1. If it turns out to need client-side JavaScript to work, the
  BBC source reads page 0 only.
- For the BBC, `parse_listing` reads the embedded `__NEXT_DATA__` JSON when it is
  present, and otherwise falls back to `<a href>` links filtered by
  `article_path_prefix`. It never selects on generated styled-component class
  names.
- `parse_article(html) -> ScrapedArticle | None` where
  `ScrapedArticle(title, body, published_at, authors)`. `published_at` is read,
  in order, from JSON-LD `datePublished`, the `article:published_time` meta tag,
  then the first `<time datetime>` in the article header — and converted to
  `INGESTION_TIMEZONE`. The body uses a site-specific selector first and falls
  back to `trafilatura`.

**`app/services/ingestion_service.py`** — one function per stage plus an
orchestrator:

- **Stage 1 — Discover** `discover_articles(db, source, day)`:
  - The window is `day` 00:00 to 24:00 in `INGESTION_TIMEZONE` (Asia/Dhaka).
    `day` defaults to yesterday; the CLI can override it with `--date`.
  - Walk listing pages `0 .. INGESTION_MAX_LISTING_PAGES - 1`. Stop early once
    every parseable `listed_at` on a page is older than the window. Listings are
    reverse-chronological, but pinned or promoted items can break that, so the
    rule is "all of the page", not "the first old item".
  - Skip URLs already present in `report`.
  - Fetch each remaining article with `news_client.fetch_article` and parse it.
    **Keep it only if `published_at` falls inside the window.** The article
    page's date is authoritative; listing dates only decide when to stop
    paginating.
  - An article with no parseable date or no extractable body is **skipped and
    logged** (`source=... url=... skipped=no_date|no_body`). There is no RSS
    summary to fall back on any more.
  - Stop at `INGESTION_MAX_ARTICLES_PER_SOURCE` kept articles.
  - A listing-level failure (bad URL, robots-denied, non-2xx) is caught here and
    reported as a source failure, without killing the run.
- **Stage 2 — Relevance filter** `filter_relevance(client, article)` — unchanged
  prompt and threshold (see "Relevance filter" below). It now always sees the
  scraped title + body (truncated for the prompt) rather than an RSS summary.
- **Stage 3 — Report extraction** `extract_report_fields(client, article)` — the
  article fetch has moved into Stage 1, so this stage is only the LLM call over
  the body already in hand. **Trust boundary unchanged:** `url`,
  `source_domain` (`urlparse(url).hostname`) and `published_date` come from the
  scraper, never from the model. `report.text` stores the full body, not
  truncated.
- **Stage 4/5 — Incident extraction, resolution, classification** — unchanged,
  including the extract-then-resolve ordering from implementation note 1:
  extract incident fields, embed `incident_embedding_input(title, description)`,
  cosine-match against `Incident.embedding` at `INGESTION_SIMILARITY_THRESHOLD`;
  attach on a match, otherwise insert incident + report + link, commit, then
  classify through `LlmClassificationService`. A classification failure is
  logged and counted but does not roll back the committed incident.
- **Orchestration** `run_ingestion_cycle(db, day=None) -> IngestionRunSummary` —
  unchanged: loops sources → stages, holds the Postgres advisory lock on one
  dedicated connection for the whole cycle (see "The advisory lock needed a
  dedicated connection"), returns `skipped` if the lock is held, and reports
  `completed` / `partial` / `failed`.

**Scheduler** (`app/main.py` lifespan) — unchanged: APScheduler
`CronTrigger(hour=INGESTION_CRON_HOUR, timezone=INGESTION_TIMEZONE)`, default
03:00 Asia/Dhaka, disabled unless `INGESTION_ENABLED=true`, single worker only.
Running at 03:00 leaves yesterday fully closed in that timezone. **A missed day
is not picked up automatically** — the window is fixed to "yesterday" relative
to the run — so a day lost to downtime is backfilled by hand with
`run_ingestion.py --date YYYY-MM-DD`. URL dedup makes any rerun safe.

**`scripts/run_ingestion.py`**:

- `--check-feeds` becomes `--check-sources`: fetch page 0 of each listing,
  print the candidate count and how many have a `listed_at` inside the window.
  No LLM, no DB writes.
- `--dry-run` — unchanged (relevance verdicts only, no writes).
- `--source <needle>` — unchanged (matches name or domain, e.g. `dailystar`).
- `--date YYYY-MM-DD` — new; sets the day window instead of yesterday.

**Manual endpoint** — `POST /api/ingestion/run` and its `IngestionRunSummary`
response are unchanged (always "yesterday"; backfills go through the CLI).

**Config (`app/config.py`, mirrored in `.env.example`)** — add
`INGESTION_MAX_LISTING_PAGES` (default `3`). Everything else stays:
`INGESTION_ENABLED`, `INGESTION_CRON_HOUR`, `INGESTION_TIMEZONE`,
`INGESTION_MAX_ARTICLES_PER_SOURCE`, `INGESTION_SIMILARITY_THRESHOLD`,
`INGESTION_RELEVANCE_MIN_CONFIDENCE`, `INGESTION_USER_AGENT`,
`INGESTION_REQUEST_DELAY_S`, `INGESTION_HTTP_TIMEOUT_S`.

**`requirements.txt`** — drop `feedparser`; keep `trafilatura`,
`lxml_html_clean` and `apscheduler`; make sure `beautifulsoup4` is listed
explicitly.

**Knock-on doc edits** (part of this change):

- `CLAUDE.md` "Ingestion invariants": `feed_client.py` → `news_client.py`, the
  scraper list becomes `dailystar_scraper.py` / `bbc_scraper.py`, and "never hand
  `feedparser` a URL" goes away (the `RobotFileParser.read()` rule stays).
- `CLAUDE.md` command examples: `--check-feeds` → `--check-sources`,
  `--source wired` → `--source dailystar`.

No frontend changes — new incidents and reports flow through the existing
Explorer/Search UI.

## Verification

1. **Sources first.** Run `python scripts/run_ingestion.py --check-sources`.
   Confirm that the robots log lines show both listing URLs allowed and that each
   listing yields more than 0 article candidates. For the BBC, also settle the
   article URL prefix, whether `__NEXT_DATA__` is present, and the pagination
   URL. If the BBC disallows our UA, remove the source and record it.
2. **Article parsing.** Spot-check `parse_article` on 2–3 articles per site:
   `published_at` matches the date shown on the page (and is in Asia/Dhaka), and
   the body is real article text — not navigation, "related stories" or
   newsletter blocks.
3. **Window.** Run `--dry-run`. Confirm only yesterday's articles reach the
   relevance step, that older ones log as outside the window, and that robots
   checks are logged for listing *and* article URLs.
4. **Full run, one source.** `--source dailystar -v`. Confirm relevant articles
   produce a `report` row with the full body and `published_date` = yesterday,
   and that both branch A (attach) and branch B (new classified incident) behave
   as before. Confirm new ids are exactly `previous MAX + 1`.
5. **Rerun.** Run again immediately; already-stored URLs are skipped, with no
   duplicate rows.
6. **Backfill.** Run with `--date` set to a day 2–3 days back. Confirm articles
   from that day are found and pagination stops at `INGESTION_MAX_LISTING_PAGES`.
7. **Carried over from the first build:** a bad listing URL yields
   `status='partial'` with the other source still processed; two overlapping
   `POST /api/ingestion/run` calls give one `skipped`; the endpoint returns the
   full count breakdown; new incidents appear in the frontend Explorer and
   Search; with `INGESTION_ENABLED=true` the scheduler logs its timezone and
   shuts down cleanly.

## Implementation notes

> These notes come from the **RSS-era build**. Where they mention feeds, those
> parts are superseded by the design above; the lessons about dedup ordering,
> the LLM client, logging, the advisory lock and the relevance prompt still
> apply as written.

Built with no new tables, no migration and `db/schema.sql` untouched. Four things
only became visible once the pipeline ran against real feeds and a real LLM, and
all four changed the code rather than the plan.

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
*(The feed half is obsolete; the dependency half still holds.)* The Verge's AI
feed path had its segments transposed and returned 0 entries; `--check-feeds`
caught it, which is why `--check-sources` keeps the same role. Separately,
`trafilatura` fails to import without `lxml_html_clean`, because its `justext`
dependency still imports `lxml.html.clean` after that moved into its own
package — pinned in `requirements.txt`.

### The advisory lock needed a dedicated connection

The plan said "wrap the cycle in a Postgres advisory lock" and treated that as
settled. It isn't, on a pooled `Session`: `pg_advisory_lock` belongs to one
Postgres backend, but a SQLAlchemy `Session` returns its connection to the pool
on every `commit()` — and this cycle commits per article. If anything else
checks out a connection in that gap, the Session continues on a *different*
backend and the lock is stranded on an idle pooled one.

Both consequences were silent. Mutual exclusion disappears — which removes the
only thing making `MAX(id)+1` safe — and the orphaned lock can never be
released, so every later cycle returns `status='skipped'` until the process
restarts. Reproduced on the unmodified pool config: lock taken on pid 266, one
concurrent checkout after a commit, cycle continues on pid 267, next cycle
blocked. The gap here is wide (an HTTP fetch, a 2s politeness delay and several
LLM calls sit between commits), so on a live server this is likely rather than
theoretical.

Now the cycle checks out one connection for its whole duration and binds a
`Session` to it, so the lock, every commit and the release share one backend.
`_try_advisory_lock`/`_release_advisory_lock` take a `Connection` rather than a
`Session` so this can't regress quietly, and a `False` unlock result is logged
as an error instead of discarded. Verified under continuous connection churn.

Worth noting for anyone tuning this later: the `MAX(id)+1` scheme is now
correct but it is load-bearing on that locking being right. Real sequences
would remove the coupling entirely — the only reason they were dropped is the
no-migration constraint.

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

Observed on live feeds (**RSS-era numbers**): **1/20** accepted on TechCrunch,
**1/20** on Ars Technica, **0/10** on The Verge. The accepted items were genuine
incidents (Grok used to generate explicit imagery from a child's photo; a
credential leak via LiteLLM). Correct borderline rejections included "Amazon is
destroying rare books to train AI" (a training-data practice, no deployed harm to
identifiable parties) and a Copilot jailbreak found by researchers in testing.
These need re-measuring on the Daily Star and BBC. Their general technology
sections (gadgets, reviews, guides) will likely have an even lower base rate than
AI-only feeds, so most days will plausibly accept zero articles. That is expected
behaviour, not a bug.

The known cost of "discard on no": rejected articles aren't persisted, so each
run re-screens them. With a fixed one-day window this only bites on a manual
rerun of the same day, or a `--date` backfill. A URL-level seen-cache would fix
it without a table if that ever matters.
