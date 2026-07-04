# AIRiskWatch — Project Specification & Implementation Plan

> An intelligence system for monitoring, classifying, and analysing AI incidents.
> This document turns the initial proposal into a concrete, scoped, buildable project and answers the open questions.

---

## 0. What the data actually is (and why it matters)

The `backup-…` folder is a **full MongoDB dump of the AI Incident Database (AIID)** plus the **MIT AI Risk Mitigation Database**. This is far more than "a static dataset" — it is a fully relational, multi-taxonomy knowledge base you can stand on. Key contents:

| Source file | What it is | Volume |
|---|---|---|
| `incidents.csv` | Incidents: title, description, date, deployer/developer/harmed-party entities, list of report IDs | **1,498 incidents** (1983 → May 2026) |
| `reports.csv` | The underlying news articles (full text, url, source, author, date, language) | **7,143 reports** (mostly English), avg **4 reports/incident** |
| `classifications_MIT.csv` | **MIT AI Risk Taxonomy** — Risk Domain (7) + Subdomain, plus Causal axes: Entity / Timing / Intent | **1,242 classified incidents** |
| `classifications_CSETv1.csv` | CSET harm taxonomy — harm domain, harm level, sector, autonomy level (rich, multi-annotator) | ~499 |
| `classifications_GMF.csv` | Goals-Methods-Failures taxonomy (AI goal, technology, technical failure) | ~4,567 |
| `[PUBLIC] Mitigation Database.csv` | **MIT Mitigation Taxonomy** — 831 governance/safety actions in 4 groups, 23 subcategories | **831 actions** |
| `aiidprod/entities.bson` | Named entities (companies, products, people) | 677 KB |
| `aiidprod/entity_relationships.bson` | Relationships between entities | 11 KB |
| `aiidprod/taxa.bson` | The taxonomy definitions themselves | 296 KB |

**Three facts that shape the whole project:**

1. **AIID already models exactly what you proposed** — an `incident` (1) → `reports` (many) structure, named `entities` with roles (developer/deployer/harmed), `entity_relationships`, and several `taxa`. You are not inventing this schema; you are *adopting a proven one and extending it*.
2. **You already have labelled ground-truth classifications** for 1,242 incidents (MIT) + others. This is gold: it becomes your **evaluation set** for measuring LLM classification accuracy (answers your accuracy question — see §8.3).
3. **The Mitigation Database is a *separate* taxonomy and is NOT pre-linked to incidents.** It is a catalogue of 831 best-practice/governance actions (e.g. "AI Safety Team", red-teaming, data-provenance controls) grouped into 4 categories. Mapping *incident → recommended mitigations* is something **you design** (see §8.5). That mapping work is a legitimate, substantial scope addition.

### MIT Risk Domains present in the data (incident counts)
```
424  4. Malicious Actors & Misuse
282  7. AI system safety, failures & limitations
230  1. Discrimination & Toxicity
159  3. Misinformation
 95  2. Privacy & Security
 33  5. Human-Computer Interaction
 19  6. Socioeconomic & Environmental Harms
```
Causal axes: Entity = {AI: 828, Human: 405}; Timing = {Post-deployment: 1211, Pre: 23}; Intent = {Unintentional: 646, Intentional: 579}.

### Mitigation taxonomy (831 actions)
```
Group 1: Governance & Oversight        (250 actions, codes 1.1–1.7)
Group 2: (102 actions, codes 2.1–2.4)
Group 3: (297 actions, codes 3.1–3.6)
Group 4: (171 actions, codes 4.1–4.6)
```

---

## 1. Vision & scope (responding to the "increase scope" review)

The board's "two-day task" comment is about *visible system depth*, not the idea. The proposal as written is essentially "scrape → classify → dashboard." We expand it into a genuine **intelligence platform** with five hard, demonstrable subsystems:

1. **Multi-taxonomy classification** — not one taxonomy but MIT Domain + Causal (and optionally CSET/GMF), with a **quantified accuracy evaluation** against the labelled data.
2. **Entity resolution & deduplication pipeline** — the genuinely hard ML/engineering problem of deciding "is this a new incident or another report of an existing one?"
3. **Mitigation recommendation engine** — incident → ranked, relevant mitigation actions, a contribution that does not exist in any current tool.
4. **Semantic / GraphRAG search** — natural-language querying over a knowledge base.
5. **Live ingestion** — scraper + scheduling + admin/monitoring panel that grows the KB automatically.

Each of these is independently defensible as "real work." Together they are clearly a final-year-scale project.

---

## 2. Users & user stories

Three personas, each needing different things from the same KB:

### Persona A — Policy maker / AI-governance analyst
- *"As a policy maker, I want to see which AI risk domains are growing fastest over the last 3 years, so I can prioritise regulation."*
- *"As a policy maker, I want to ask in plain language: 'what kinds of AI systems are causing the most harm to women and children?' and get a ranked, evidence-backed answer."*
- *"As a policy maker, I want to see, for a given risk subdomain, which mitigation actions the literature recommends."*

### Persona B — Developer / AI engineer
- *"As a developer about to build [an obstacle-detection aid for blind users], I want to describe my system and see what incidents similar systems have caused, so I can design around those failure modes."*
- *"As a developer, I want to filter incidents by AI technology / task and see the concrete technical failure and the recommended mitigations."*

### Persona C — Researcher
- *"As a researcher, I want to explore the relationship graph between developers, deployers, and harmed parties across incidents."*
- *"As a researcher, I want to export a filtered, classified incident set with its source reports for my own analysis."*

### Admin (you / operator)
- *"As an admin, I want to add/enable scrape sources, trigger a scrape run on demand, watch ingestion runs, and review/correct LLM classifications & dedup decisions."*

---

## 3. Feature list

**Public / user features**
- F1. Incident explorer (list + detail: description, classifications, linked reports, entities, recommended mitigations).
- F2. Persona-aware analytics dashboard (see §6 for which charts for whom).
- F3. Natural-language semantic search (RAG / GraphRAG) returning relevant incidents + a synthesised, **cited** summary.
- F4. Faceted filtering: risk domain/subdomain, causal axes, organisation/entity, sector, harmed party, time range.
- F5. Entity & relationship view (organisation → its incidents → harmed parties).
- F6. Mitigation lookup (per incident and per risk subdomain).
- F7. Saved searches / export.

**Admin & pipeline features**
- F8. Source management (add RSS/HTML sources, selectors, enable/disable).
- F9. Scrape orchestration: scheduled (cron) **and** manual trigger; run history & status.
- F10. Ingestion review queue: low-confidence relevance / dedup / classification decisions surfaced for human approval.
- F11. Classification evaluation report (accuracy/F1 vs the labelled gold set).

---

## 4. System architecture

```
                       ┌──────────────────────────────────────────────┐
                       │                 INGESTION                      │
  Sources (RSS/HTML)──▶│ Scraper ─▶ Relevance filter ─▶ LLM structured  │
   + scheduled cron     │ (fetch)    (cheap+LLM gate)     extraction     │
   + manual trigger     └───────────────┬──────────────────────────────┘
                                         ▼
                       ┌──────────────────────────────────────────────┐
                       │           RESOLUTION & ENRICHMENT              │
                       │ Embedding ─▶ vector + entity match ─▶ LLM      │
                       │ "same incident or new?"  ─▶ upsert             │
                       │ Multi-taxonomy classification (LLM)            │
                       │ Mitigation recommendation (retrieval + LLM)    │
                       └───────────────┬──────────────────────────────┘
                                         ▼
                       ┌──────────────────────────────────────────────┐
                       │   PostgreSQL + pgvector (single source of truth)│
                       │   incidents · reports · entities · rels ·       │
                       │   classifications · mitigations · embeddings    │
                       └───────────────┬──────────────────────────────┘
                                         ▼
        ┌────────────────────────┬───────────────────────────┐
        ▼                        ▼                           ▼
  Analytics API            Semantic search API          Admin API
  (aggregations)           (RAG / GraphRAG)             (sources, runs, review)
        └────────────────────────┴───────────────────────────┘
                                  ▼
                       Web frontend (dashboards · explorer · search · admin)
```

**Recommended stack** (pick what you know — these are defaults that fit):
- **DB:** PostgreSQL + **pgvector** extension (vectors live next to relational data — see §8.6).
- **Backend:** your choice (Node/Express, FastAPI, or Spring Boot — you already work in a Spring/JPA style). Any is fine.
- **LLM:** a structured-output–capable model (Claude / GPT) called with strict JSON schemas.
- **Scraping:** RSS where available + `requests`/`httpx` + readability/trafilatura for article text; Playwright only for JS-heavy sites.
- **Frontend:** React + a charting lib (Recharts/ECharts) + a graph lib (Cytoscape.js / react-force-graph) for the relationship view.

---

## 5. Data model (PostgreSQL)

Core tables (simplified):

```sql
-- Incidents & reports (mirrors AIID)
incident(id PK, title, description, incident_date, status,
         first_seen_at, embedding vector)            -- embedding of description
report(id PK, incident_id FK→incident, title, text, url UNIQUE,
       source_domain, author, published_date, scraped_at, language,
       embedding vector, relevance_score)            -- embedding of report text

-- Entities & relationships (mirrors AIID entities/entity_relationships)
entity(id PK, name, slug UNIQUE, type)               -- org / product / person / group
incident_entity(incident_id FK, entity_id FK, role)  -- role: developer|deployer|harmed
   PRIMARY KEY(incident_id, entity_id, role)
entity_relationship(from_entity FK, to_entity FK, rel_type)

-- Taxonomies (reference data, loaded once)
risk_domain(id PK, code, name)                        -- 7 MIT domains
risk_subdomain(id PK, domain_id FK, code, name)
incident_classification(id PK, incident_id FK, namespace,   -- 'MIT','CSET','GMF'
       risk_subdomain_id FK NULL, causal_entity, timing, intent,
       confidence, classified_by, classified_at)     -- classified_by: 'llm'|'human'|'aiid'

-- Mitigations (the MIT Mitigation DB)
mitigation_action(id PK, action_id, name, definition, source,
                  mitigation_code, group_no, embedding vector)
risk_mitigation_map(risk_subdomain_id FK, mitigation_code, weight)  -- the crosswalk YOU build
incident_mitigation(incident_id FK, mitigation_action_id FK, relevance_score, rationale)

-- Ingestion / ops
scrape_source(id PK, name, base_url, type, config_json, enabled)
scrape_run(id PK, source_id FK, started_at, finished_at, status,
           n_fetched, n_relevant, n_new_incidents, n_new_reports, error)
review_item(id PK, kind, payload_json, status, decided_by, decided_at) -- human-in-loop queue

-- App
admin_user(id PK, email, password_hash, role)
saved_search(id PK, user_id FK, query, filters_json, created_at)
```

> **Indexes that matter:** `report(url)` unique (dedup at source), HNSW/IVFFlat vector indexes on `incident.embedding` and `report.embedding`, btree on `incident.incident_date`, and the FK columns.

---

## 6. Dashboard — which visualisation for which persona (F2)

Charts must answer a real question, not decorate. Mapping:

| Visualisation | Question it answers | Primary persona |
|---|---|---|
| **Stacked area / line: incidents per risk domain over time** | "Which risks are trending?" | Policy maker |
| **Treemap: risk domain → subdomain volume** | "Where is harm concentrated?" | Policy maker |
| **Bar: top deployers/developers by incident count** | "Who is involved most?" | Policy maker / researcher |
| **Heatmap: risk subdomain × harmed-party group** | "What harms which group?" (the women/children query, visually) | Policy maker |
| **Sankey: AI technology → technical failure → harm domain** | "How do failures propagate?" | Developer |
| **Bar: incidents by sector / autonomy level** (CSET data) | "Which deployment contexts are riskiest?" | Developer |
| **Force-directed graph: entity relationships** | "How are orgs/products/harms connected?" | Researcher |
| **Per-incident mitigation panel** | "What should I do about this risk?" | Developer / policy maker |

Build 3–4 of these well rather than 10 superficial ones; tag each chart with the persona it serves.

---

## 7. End-to-end data flow (live ingestion)

1. **Trigger** — scheduled cron (default) or admin manual trigger.
2. **Fetch** — pull candidate articles from each enabled source; extract clean article text; drop anything whose `url` already exists (cheap exact dedup).
3. **Relevance gate** — two-stage (see §8.2): cheap keyword/heuristic prefilter → LLM binary classifier "is this a real AI incident report?" with confidence.
4. **Structured extraction** — LLM with strict JSON schema produces: title, summary, date, candidate entities (developer/deployer/harmed), and snippets.
5. **Entity resolution & incident dedup** (see §8.4) — embed → vector + entity match → LLM adjudication → upsert as new incident *or* attach as new report on an existing incident.
6. **Classification** (see §8.3) — LLM assigns MIT Domain/Subdomain + Causal axes (+ optional CSET/GMF), with confidence.
7. **Mitigation recommendation** (see §8.5) — retrieve mitigation actions for that subdomain + semantic match → LLM ranks/justifies → store.
8. **Embed & index** — store embeddings for search.
9. **Review queue** — anything below confidence thresholds (relevance, dedup, classification) goes to F10 for human approval rather than silently entering the KB.
10. **Available** to dashboards & search immediately on approval.

---

## 8. Answers to your open questions

### 8.1 Is the framework / mitigation data actually useful? — **Yes, in two distinct ways.**
- The **classification taxonomies** (MIT/CSET/GMF) give you (a) a labelling target and (b) **ground-truth labels for 1,242+ incidents** — your evaluation set. Without them you'd have no way to prove your classifier works.
- The **Mitigation Database** is the basis of your *recommendation engine* — the feature that makes AIRiskWatch more than another incident viewer. But note: **it is not linked to incidents in the data.** Creating that incident→mitigation link (§8.5) is your novel contribution and a real scope addition. Use both.

### 8.2 How does the scraper know a report is relevant?
Two-stage filter (cheap → expensive):
1. **Prefilter (free):** prefer RSS feeds / sections already about AI; keyword & regex gate (model names, "AI", "algorithm", "automated", harm words). Reject obvious non-matches without an LLM call.
2. **LLM relevance classifier:** for survivors, one structured call returning `{is_ai_incident: bool, confidence: 0–1, reason}`. Definition to give the model: *"a real-world event where a deployed or tested AI/automated system caused or nearly caused harm."* Accept high confidence, send borderline to the review queue (F10). You can validate this gate too — your 7,143 known-relevant reports are positive examples; random general news are negatives.

### 8.3 How to assess classification accuracy? — **You already have a gold set; use it.**
- Hold out the 1,242 MIT-labelled incidents as ground truth.
- Run your LLM classifier on their report text (don't show it the label).
- Compute **accuracy, precision/recall/F1 per risk domain, and a confusion matrix** (macro-F1 matters because domains are imbalanced — 424 vs 19). Also report **top-1 vs top-2 accuracy** (subdomain is a 20+-way classification; top-2 is fair).
- Iterate the prompt / few-shot examples until the numbers are good; **the eval harness itself (F11) is a presentable deliverable.** Do the same per taxonomy if you add CSET/GMF.

### 8.4 Deduplication — new incident vs. new report of an existing one? — **The hard part; here's a concrete recipe.**
A 3-gate cascade, cheap → expensive:
1. **Exact:** same/canonical URL ⇒ duplicate report, skip.
2. **Candidate retrieval:** embed the new report; vector-search the top-k nearest existing **incidents** (by description embedding), *and* require shared entities (same developer/deployer) or time proximity. This narrows 1,498 incidents to ~5 candidates.
3. **LLM adjudication:** give the model the new report + each candidate incident's summary; ask `{decision: same|different, matched_incident_id, confidence}`. Definition: *"same incident = same underlying real-world event (same system, same harm, same timeframe), even if reported by a different outlet."*
   - `same` + high conf ⇒ attach as a new report under that incident.
   - `different` + high conf ⇒ create a new incident.
   - otherwise ⇒ review queue (F10).

You can **validate** this too: AIID's `incidents.reports` arrays already tell you which reports belong together — hold some out and measure how often your pipeline re-clusters them correctly.

### 8.5 Selecting the proper mitigation — how, given no direct link in the data?
Build the link in two layers:
1. **Static crosswalk (`risk_mitigation_map`):** once, with an LLM (or by hand, reviewing the 23 mitigation subcategories against the 7×subdomain risk taxonomy), map each risk subdomain to the mitigation codes that address it. Small, reusable, reviewable.
2. **Per-incident ranking:** at ingestion, take the incident's subdomain → candidate mitigation actions from the crosswalk, then **semantic-rank** them against the incident text (embedding similarity) and have the LLM pick the top N with a one-line rationale → `incident_mitigation`.
- *Accuracy here is harder to "prove"* (no ground truth), so frame it as **relevance**: present rationale + source, and let admins thumbs-up/down in the review queue to build a small human-rated sample you can report on.

### 8.6 / 8.7 Knowledge graph vs SQL? Is GraphRAG essential? — **Recommendation: Postgres-first, graph as a focused enhancement.**
Be honest in your report about this trade-off — it shows engineering maturity.

- **For ~95% of your features** (trends, facets, filtering, "incidents by org/sector/harmed-party"), **PostgreSQL + pgvector is enough and simpler.** Relational joins handle incident↔report↔entity↔classification cleanly; pgvector handles semantic search. Don't add a graph DB just to add one.
- **A knowledge graph earns its place only for true multi-hop relationship queries** — e.g. *"find harmed-party groups connected to developers who also deploy systems in the healthcare sector"* — and for the researcher's relationship-exploration view. You can serve most of this from the relational `entity_relationship` table; a dedicated graph (Neo4j, or `pgRouting`/recursive CTEs in Postgres) only pays off if you go several hops deep.
- **Pragmatic recommendation for scope vs. effort:** Phase 1–6 on **Postgres + pgvector only**. Treat the **knowledge-graph + GraphRAG layer as an explicit "advanced" Phase 8** (§9) that you do if time allows and that you can write up as a comparison ("we evaluated SQL-RAG vs GraphRAG"). That comparison *is itself* a strong final-year contribution and directly addresses the board's scope concern without forcing a graph DB into places it isn't needed.
- **Is GraphRAG essential if you build a KG?** No. Plain **RAG** (embed query → vector-retrieve incidents/reports → LLM answers with citations) fully satisfies the dev and policy-maker search examples. **GraphRAG** (retrieve a subgraph / traverse relationships, then answer) only adds value for the multi-hop relational questions above. Build RAG first; add GraphRAG as the differentiator if Phase 8 happens.

### 8.8 Scraper trigger: admin panel vs every-24h? — **Both. Cron is the backbone, manual is the override.**
- **Scheduled cron (~daily)** is the right default — incidents don't break hourly, and it makes "the KB grows automatically" (a proposal promise) true without you touching it.
- **Add a manual trigger in the admin panel** for demos, testing a newly-added source, and on-demand refresh.
- Implement them as the *same* job behind two triggers; record every run in `scrape_run` (F9). This is small extra effort and demos far better than either alone.

---

## 9. Phased implementation plan

Ordering principle: **seed the KB from the AIID data first (de-risks everything), then add live scraping last.** Every phase ends with something demonstrable.

### Phase 0 — Foundations & data import  ▸ *de-risks the whole project; do this first*
- Set up repo, Postgres + pgvector, backend skeleton, CI.
- Write importers: load `incidents.csv`, `reports.csv`, `entities`/`entity_relationships` (from BSON via `bsondump`/`mongorestore` → export, or parse), all taxonomies, and the Mitigation DB into the schema (§5).
- **Milestone:** a queryable database of 1,498 incidents, 7,143 reports, entities, and 831 mitigations. You can already write SQL like "incidents per domain per year."

### Phase 1 — Read-only API + basic incident explorer
- REST/GraphQL endpoints: list/detail incidents, reports, entities, classifications.
- Minimal frontend: incident list + detail page + faceted filters (F1, F4).
- **Milestone:** browse the imported KB in a browser.

### Phase 2 — LLM extraction & classification + **evaluation harness**
- Structured-output extraction prompt; multi-taxonomy classifier (MIT Domain/Causal first).
- Build the eval harness (§8.3) on the gold set; iterate prompts to good macro-F1. (F11)
- **Milestone:** "we classify incidents with X% accuracy" — a hard, measurable result.

### Phase 3 — Embeddings + semantic (RAG) search
- Generate & index embeddings for incidents/reports; build the query→retrieve→cite-answer pipeline (F3).
- Validate on the two example queries (blind-aid dev query; women/children policy query).
- **Milestone:** natural-language search returning cited incidents.

### Phase 4 — Dedup & entity-resolution pipeline
- Implement the 3-gate cascade (§8.4); validate against AIID's known report clusters.
- **Milestone:** "given a new report, we correctly attach-or-create with Y% accuracy."

### Phase 5 — Mitigation recommendation engine
- Build `risk_mitigation_map` crosswalk; per-incident ranking (§8.5); surface in incident detail (F6).
- **Milestone:** every incident shows ranked, justified mitigations.

### Phase 6 — Persona dashboards
- Implement the 3–4 priority visualisations (§6) + the entity relationship view (F2, F5).
- **Milestone:** the analytics story for each persona.

### Phase 7 — Live ingestion: scraper + scheduling + admin panel
- Source management (F8), scraper, two-stage relevance gate (§8.2), wire into Phases 2/4/5 pipeline.
- Cron + manual trigger + run history + review queue (F9, F10).
- **Milestone:** the KB grows on its own from real sources; admin can watch and correct it.

### Phase 8 — *(Advanced, optional)* Knowledge graph + GraphRAG
- Build a graph layer over entity relationships; implement GraphRAG for multi-hop queries; **write up the SQL-RAG vs GraphRAG comparison.**
- **Milestone:** the differentiator + a research-grade evaluation.

### Phase 9 — Hardening, write-up, demo
- Tests, auth, docs, the accuracy/relevance numbers consolidated into your report, demo script.

---

## 10. Suggested first week (concrete starting steps)

1. Stand up Postgres + pgvector locally; create the schema in §5.
2. Convert the BSON collections you want (`entities`, `entity_relationships`, `taxa`) with `bsondump`/`mongorestore`; you already have the CSVs for incidents/reports/classifications/mitigations.
3. Write and run the Phase-0 importers; confirm counts (1,498 / 7,143 / 1,242 / 831).
4. Run a few sanity SQL queries (incidents per domain per year) to prove the model.
5. Pick your backend framework and scaffold the read-only incident endpoint (start of Phase 1).

Doing Phase 0 first means that even if the LLM/scraper work runs late, you always have a working, data-backed system to show.
