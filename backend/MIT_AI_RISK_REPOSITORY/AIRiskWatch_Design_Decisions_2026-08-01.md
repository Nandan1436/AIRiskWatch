# AIRiskWatch — Design Decisions & Discussion Log (Ingestion, Classification, Search)

> **Date:** 2026-08-01
> **Purpose:** Capture, explicitly, every important decision from today's discussion — focused on (1) the daily-scraper ingestion pipeline and where LLM calls actually belong in it, (2) incident-resolution/dedup via embeddings, (3) why classification must run on the incident, not the raw report, (4) why a trained encoder classifier (DistilBERT/RoBERTa) is rejected in favour of the existing LLM few-shot approach, and (5) the personalized/natural-language-search feature's final, simplified shape.
> **Companion files:** `AIRiskWatch_Spec_And_Plan.md` (§7 ingestion, §8.2–8.5), `AIRiskWatch_Design_Decisions_2026-06-22.md` (mitigation reframe), `2507.23669v1.md` (cited paper — semantic association of reports to AI incidents, AIID).
>
> This log exists because the ingestion/classification/search design was worked out across a long back-and-forth and repeatedly re-confused mid-discussion (scraping vs. classification, report-level vs. incident-level classification, whether search needs a chatbot). Treat this file as the settled answer — don't re-derive it from scratch in a future session.

---

## 1. The daily ingestion pipeline — five stages, only three of which use an LLM

The recurring confusion was treating "scrape → classify" as one fused step. It is not. The full pipeline, as a cron job firing once a day:

```
1. Scrape (cron, daily)
   -> fetch raw candidate articles from a fixed set of trusted news sources

2. Relevance filter                                    [LLM call #1]
   -> "is this article describing a real AI incident?" yes/no
   -> discard on "no"

3. Structured extraction — REPORT fields (always)      [LLM call #2]
   -> title, text, url, source_domain, authors, published_date, language
   -> every relevant article becomes a `report` row, unconditionally

4. Incident resolution (NOT an LLM call — embeddings only)
   -> embed the new report's title+description
   -> cosine similarity against existing incident.embedding vectors (pgvector, `<=>` operator)
   -> branch A (match found, similarity above threshold):
        this report describes an EXISTING incident.
        insert the report row; link via incident_report to that incident.
        do NOT create a new incident row. do NOT re-extract incident fields.
   -> branch B (no match / corpus empty):
        this is a NEW incident.
        extract INCIDENT fields from the report (title, description, incident_date,
        alleged_deployer[], alleged_developer[], harmed_parties[])              [LLM call #2b]
        insert incident + report + incident_report link.

5. Classify (branch B only, by default)                [LLM call #3]
   -> run the SAME MIT-taxonomy classifier already built (`llm_classification_service.py`),
      on the INCIDENT (title + description + linked report(s)) — not on the raw report text.
   -> store classification row, classified_by='llm', confidence, classified_at.

6. Store — everything above is now committed; visible via Explorer/Dashboard/Search.
```

### Decisions from this

- **Three LLM calls total in ingestion**, not one fused call: relevance filter, structured extraction (report always, incident conditionally), classification. Extraction into `report` fields and extraction into `incident` fields are the same *kind* of call but fire at different points (report extraction is unconditional; incident extraction only fires in branch B, after resolution decides this is genuinely new).
- **Incident resolution is pure embedding similarity, not an LLM call.** This reuses pgvector exactly as it's already declared in the schema (`incident.embedding VECTOR(1536)`, `report.embedding VECTOR(1536)` in `db/schema.sql`) — no new infrastructure, no separate vector DB.
- **Why resolution must happen before incident-field extraction, not after:** the schema already models one incident having many reports (`incident_report` many-to-many join table) — this is real in the seeded data today (see existing memory note: some incidents already have >1 classification row from repeated/duplicate seeding). Extracting-then-resolving risks creating a duplicate incident with slightly different extracted text for an event you already have. Resolve first; only extract incident-level fields on a genuine branch-B miss.
- **Method for resolution, concretely:** don't train a custom encoder for this. Use an off-the-shelf pretrained sentence-embedding model and cosine similarity, take the top-1 match, apply a similarity threshold to decide match-vs-new. This directly follows the cited paper (`2507.23669v1.md`, Russo et al., "Automating AI Failure Tracking") whose core finding is that a pretrained sentence transformer (`multi-qa-MiniLM-L6-cos-v1`) beats BM25, BM25+T5, and fine-tuned cross-encoders for exactly this report-to-incident association task — no training required. The paper also confirms (RQ1) that **combining title + description** beats title-alone by 15–25 points on Accuracy@K/MRR@K/NDCG@K — use both fields in the embedding input, not title alone.
  - **Threshold judgment call:** start conservative (new incident is the safer default over wrongly merging two unrelated events); tune empirically.
  - **Optional stretch, not core:** an LLM tie-breaker call for borderline near-threshold cases ("are these the same incident? yes/no") — only if the embedding-only threshold proves too noisy in practice. This would be a 4th ingestion-side LLM call if added; treat it as optional/future work, not part of the baseline design.
- **Classification reclassification policy:** classify once at incident creation (branch B); do **not** automatically reclassify when new reports later attach to an existing incident via branch A. Reclassifying on every new corroborating report adds LLM cost for unclear benefit; revisit only if evidence shows early classifications are frequently wrong once more reports accumulate.
- **Human review gate:** confirmed fully automatic end-to-end for this project's scope — no admin/reviewer role, no manual approval queue before a scraped incident enters the live corpus. (The spec's F11 "ingestion review queue" and admin role are documented as Exciting-tier / target-system scope, explicitly **not** implemented in this project — see SRS §2.1.3 "Administrator and reviewer roles..." bullet, which is deliberately scoped out.)

---

## 2. Classification: incident-level, never report-level — and why

**Question raised:** should classification run on the raw scraped report, or on the structured incident? And separately: since the gold data is thin and imbalanced per subdomain, should unclassified rows in the `report` table (reports with no incident reference) be mined as extra training data for a trained encoder classifier?

**Decision: classification always runs on the incident** (title + description + its linked report(s) as context), never on a raw report directly, for three converging reasons:

1. **The existing gold data is already incident-level.** `mit_classification.incident_id` — one row per incident — and the existing classifier's prompt construction is already "title + description + up to 2 linked reports, truncated." Branch-B ingestion must match this exact input shape, or measured eval accuracy (from `evaluate_classifier.py`) won't predict real production accuracy — a train/serve mismatch.
2. **A risk classification is semantically a property of the event, not of any one article about it.** Different reports of the same incident vary in tone/completeness; classifying per-report risks the same real-world event getting inconsistent labels depending on which article happened to be scraped. Incident-level classification (using all linked reports as combined context) is the more stable, more correct unit of labelling.
3. **Consequence for branch B specifically:** extraction must happen *before* classification. Never feed the raw scraped-report text straight into the classifier — always extract-to-incident first (§1 above), then classify using the incident's fields + linked reports.

### Rejected alternative: training a DistilBERT/RoBERTa encoder classifier

This was raised as a way to fix subdomain class imbalance (mining the unclassified/unreferenced rows in `report` for more training examples). **Rejected — this restates a decision already made and documented in `phase2.md`:**

> "only 1,242 incident-level labels exist; the 21 subdomains have a severe long tail (12 of 21 have <20 examples, 7 have ≤4) — untrainable. The 1,242 labels are worth far more as a held-out gold eval set."

Padding out training data from unreferenced reports doesn't fix this: (a) those reports have no gold labels of their own — you'd still need *human* annotation to use them as supervised training examples, which is exactly the bottleneck being avoided; (b) it would dilute or destroy the only held-out eval set that currently measures the LLM classifier's real accuracy. **Conclusion: do not train a custom encoder. Continue using the existing LLM few-shot classifier (Gemini/Mistral) for all real classification work — both manual backfill and scraper branch B — reusing the same `llm_classification_service.py` / `mit_taxonomy.py` code, not a second implementation.** The 1,242 gold incidents remain a pure eval set, never touched for training.

---

## 3. Natural-language search / personalization — final simplified shape

Two flows were repeatedly conflated; they are now split explicitly.

### Flow A — ad-hoc natural-language question (F3 in the spec)
A conversational question ("what kinds of AI systems are causing harm to women and children?"). Needs genuine RAG: embed query → retrieve top-k via pgvector cosine similarity → LLM generates a cited, synthesised answer grounded only in the retrieved incidents.

### Flow B — personalized system-description matching (F6/F7 in the spec) — **this is the one the project is committing to**
A developer describes their own AI system (not a question) and wants relevant past incidents. **Decision: this is the flow being built**, with an added LLM summary layer:

```
1. User provides a free-text system description (at signup, or as a one-off query)
2. Embed the description (same embedding model as the incident corpus)
3. Retrieve top-k incidents via pgvector cosine similarity against incident.embedding
   (fixed k, e.g. k=10 — NOT "all matches", NOT exhaustive)
4. LLM call #4 (search-side): given the description + the k retrieved incidents
   (title, description, classification for each), generate a short (3-5 sentence)
   grounded summary, citing incidents by number/ID. Prompt explicitly forbids
   inventing details not present in the provided incident text.
5. Return: the summary + the ranked list of the k source incidents (each still
   individually clickable through to its normal detail page).
```

### Decisions from this

- **Not a chatbot.** No multi-turn conversation, no memory of prior turns, no follow-up-question handling. Single-shot: one query in, one summary + incident list out. This matches the spec's original F3 wording ("RAG search returning relevant incidents + a synthesised, cited summary") and is dramatically simpler to build and reason about than a conversational agent.
- **Never state exact counts or claim completeness.** If a user wants "how many incidents about X happened last year," that is the job of the existing Explorer + filters (exact `COUNT` query against structured columns) — a deterministic, trustworthy path that already exists. The RAG/summary path only ever sees its fixed top-k window and must never be asked or allowed to assert a total; asking an LLM to count over a k-limited retrieval window is a known failure mode (confidently wrong once the true count exceeds k). Keyword/facet search and natural-language summary search are complementary, not competing — the summary path exists to catch fuzzy/conceptual queries that keyword search misses (synonyms, paraphrases), not to replace exact filtering.
- **Retrieval itself needs no LLM call** — same pgvector mechanism as incident-resolution (§1), just embedding a system description instead of a report. The only LLM call in this feature is the summary-generation step over an already-fixed, already-retrieved set of incidents, which is a narrower and lower-hallucination-risk prompt than open-ended Q&A (it's explaining relevance of a fixed list, not synthesizing free-form claims).
- **No separate vector database.** `pgvector` (already enabled in `docker-compose.yml`, already declared as `incident.embedding`/`report.embedding VECTOR(1536)` columns in `schema.sql`) is sufficient at this corpus scale (~1,500-2,000 incidents). Remaining build-out work is only: (a) populate the embeddings (currently declared but unpopulated per the earlier codebase inventory), (b) add an HNSW/IVFFlat index once corpus size makes a sequential scan noticeably slow (not urgent at current scale), (c) the query itself is a single `ORDER BY embedding <=> :query_embedding LIMIT :k` — no new service to stand up.
- **Cache-vs-regenerate for the signup-registered version:** if the system description is stored once at signup (`user_profile.embedding`), the summary can be generated once and cached, regenerated only when the user edits their description or enough new matching incidents accumulate to warrant a refresh — avoids repeated LLM cost for a description that hasn't changed. (Left as an implementation-time decision; not yet finalized which trigger to use.)

---

## 4. Final LLM call count — 4 total, everything else is embeddings-only

| # | Call | Module | Runs on |
|---|---|---|---|
| 1 | Relevance filter | Ingestion | raw scraped article |
| 2 | Structured extraction | Ingestion | report fields (always) + incident fields (branch B only) |
| 3 | Classification | Ingestion (branch B) + existing manual backfill script | incident (title + description + linked reports) — same classifier, same code, both call sites |
| 4 | Summary generation | Natural-language / personalized search | fixed top-k retrieved incidents + user's query/system description |

Everything else that sounds like it should need an LLM — incident resolution/dedup (§1), personalized matching (§3), notification triggering (spec F7) — is pure embedding + cosine-similarity math against pgvector, no LLM call, no separate vector database. This is the cheapest and most defensible part of the design: two "smart-feeling" features (dedup, personalization) come essentially free off one shared embedding model, with LLM spend concentrated on the four steps above where generation or judgment genuinely can't be done with a similarity score alone.
