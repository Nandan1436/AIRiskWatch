# AIRiskWatch — Design Decisions & Discussion Log

> **Date:** 2026-06-22
> **Purpose:** Capture, explicitly, every important decision and clarification from today's discussion — focused on (1) what the mitigation data actually is, (2) how an AI risk framework genuinely fits the project, (3) the reframed mitigation feature, and (4) the corrected high-level architecture.
> **Companion files:** `AIRiskWatch_Spec_And_Plan.md` (the full plan), `AIRiskWatch_Architecture.html` (the rendered architecture diagram), `[PUBLIC] Mitigation Database 2025-07-23.csv` (the mitigation source data).

---

## 1. The core realisation: what the mitigation table *actually* is

The mitigation table is **not** a list of "how to fix this bug" tips for developers. Inspecting the real rows of `[PUBLIC] Mitigation Database 2025-07-23.csv` (831 rows) shows:

- The "actions" are largely **organizational / governance controls**, many phrased as **audit-questionnaire items**:
  - *"Does your organization have a safety team?"*
  - *"Does the BOD engage in regular crisis response training?"*
  - *"AGI labs should have a board risk committee…"*
  - *"Multi-party authorisation for LLM deployment system changes"*
- They are sourced from **policy / governance frameworks**, not engineering guides:
  - **NIST2024 (203)**, **UK Government2023 (170)**, Future of Life Institute2024 (87), Gipiškis2024 (83), Barrett2024 (80), Schuett2023 (51), Eisenberg2025 (42), Uuk2024 (28), Bengio2025 (26), Campos2025 (20)…
- They are organized into **4 groups / 23 subcategories** (the `MitigationCode` column), e.g.:

```
Group 1 — Governance & Oversight        (1.1 Board Structure, 1.2 Risk Management, 1.4 Whistleblower Protection, …)
Group 2 — Technical & Security          (2.1 Model & Infra Security, 2.3 Model Safety Engineering, 2.4 Content Safety Controls, …)
Group 3 — Operational Process           (3.1 Testing & Auditing, 3.4 Staged Deployment, 3.5 Post-deployment Monitoring, 3.6 Incident Response, …)
Group 4 — Transparency & Accountability (4.1 System Documentation, 4.2 Risk Disclosure, 4.3 Incident Reporting, 4.6 User Rights & Recourse, …)
```

**Subcategory counts (from the data):** largest are 3.1 Testing & Auditing (127), 1.2 Risk Management (125), 3.2 Data Governance (57), 3.5 Post-deployment Monitoring (50), 4.2 Risk Disclosure (44), 2.3 Model Safety Engineering (38), 4.1 System Documentation (37), 1.1 Board Structure (35).

### Decisions from this
- **DO NOT** sell the feature as "per-incident, one-line fix-it advice for developers." A one-liner like *"you should have an AI Safety Team"* attached to a single incident is close to useless and is a mismatch with the data. The user's skepticism here was correct.
- The table **IS** valuable — but for a **different purpose** than the original plan implied (see §3).
- The columns we rely on: `Action ID`, `Action Name`, `Action Definition`, **`Action Source`** (framework provenance — critical), **`MitigationCode`** (subcategory).

---

## 2. What a risk management framework is, and why it matters here

Reference discussed: **NIST AI Risk Management Framework (AI RMF)** — https://www.nist.gov/itl/ai-risk-management-framework

- **Definition:** a *structured, repeatable process* for deciding what could go wrong with an AI system, how bad it would be, and what to do about it. It is **not** a checklist of fixes — it is a *cycle* an organization runs continuously.
- **NIST AI RMF (Jan 2023, voluntary):** aims to make AI **trustworthy** (valid, safe, secure, accountable, fair, privacy-preserving, transparent). Built around four functions run in a loop:
  - **Govern** — org structure, policies, accountability, culture.
  - **Map** — context: what the AI is for, who it could harm, what could fail.
  - **Measure** — test, audit, monitor; quantify the risks.
  - **Manage** — act: mitigate, prioritise, respond to incidents.
- **Who uses it:** any org that builds/deploys AI — governance/compliance teams, risk officers, ML leads, auditors, and increasingly regulators. It is **voluntary and flexible**, *not* a law.
- **How it's used in practice:** as a **self-assessment + gap-analysis tool** — "here are the recommended controls; here are the ones we have; here are the gaps; let's prioritise."

### Why this is relevant to AIRiskWatch (the key insight)
- **Frameworks (NIST, EU AI Act, UK Gov…) = the "supply side":** abstract menus of controls orgs *should* have.
- **Your incident database = the "demand side":** concrete evidence of what *actually* went wrong, 1,498 times.
- **Almost nobody connects the two.** AIRiskWatch can be the bridge: link real incidents back to the framework controls relevant to them, and show — in aggregate — **which controls matter most for which real-world harms, and where frameworks have blind spots.**
- **The mitigation table is itself a harmonized merger of ~10 frameworks** (NIST + UK Gov + EU AI Office + FLI + …), normalized into one taxonomy with source provenance. That harmonization is the "AI risk framework" scope increase the user wanted — it already exists in the data; the project just exposes and operationalises it.

---

## 3. The reframed mitigation feature

**Reframe:** from *"per-incident advice generator"* → to a **risk → control crosswalk + gap-analysis engine** (a framework-harmonization layer).

The table delivers value in three ways, none of which is "advice for one dev on one incident":

1. **Framework-harmonization layer** — `Action Source` lets you show, per risk, which frameworks cover it. MIT already merged ~10 frameworks into one taxonomy.
2. **Risk → control crosswalk at the *taxonomy* level** (not the incident level) — map each MIT risk subdomain → relevant control families. Build **once**, reusable, reviewable. Incidents inherit controls via their classification — **no per-incident hand-labelling**.
3. **Gap / coverage analytics** — aggregate across all incidents: which control families address the most-prevalent harms, and which frameworks have blind spots. This is the genuinely impressive, novel deliverable.

### 3a. Chosen lead persona — the Governance Analyst / Policymaker
This is the persona the data serves best (the controls are governance-level).

- **Their frustration:** frameworks give an abstract menu of controls with no empirical grounding for *which* matter; incident databases show what went wrong but don't connect to frameworks. They bridge the two by hand in spreadsheets.
- **What they need:** *"Here is a real-world risk that is growing. Here are the control families — across NIST, EU, UK Gov — that address it. Here is the evidence (the real incidents). Here is which frameworks cover it vs. which don't."* → evidence-backed policy briefs instead of opinion-backed ones.

### 3b. The feature — "Risk → Control Coverage & Gap Explorer"
One screen. Analyst picks a risk (e.g. *Misinformation*, 159 incidents) and gets:

- **(a) Control crosswalk** — ranked control families addressing the risk, with relevance, #actions, and which frameworks cover them.
- **(b) Drill-down** — the concrete controls in a family, each attributed to its source framework.
- **(c) Evidence panel** — the real incidents grounding that risk class (clickable).
- **(d) Coverage/gap matrix** — a *risk × framework* grid showing where each framework covers or has a blind spot.

**Usage example:** analyst drafting a misinformation brief opens the screen, sees Content Safety Controls (2.4) + Post-deployment Monitoring (3.5) are most-associated, sees NIST + EU AI Act cover them while another framework has a gap, cites the 159 incidents as evidence, exports the table. Minutes instead of days.

### 3c. The honesty rule (non-negotiable — makes it credible, not hype)
- There is **no ground truth** that "control X would have prevented incident Y." **Never claim causation.**
- The relevance score is an **association**, derived from (a) what frameworks say the control addresses + (b) LLM/expert judgment, optionally refined by (c) analyst thumbs-up/down.
- Always label it **"relevance / coverage,"** always show the **source** and a **rationale**, and state the limitation in the report. This framing is *more* impressive than a fake "prevention" claim.

### 3d. Serving the other personas (same engine, different lens)
- **Developer:** filter the crosswalk to the **technical/operational** families (Groups 2 & 3) and key off the incident's **GMF technical-failure** label + similar incidents.
- **Researcher:** expose the crosswalk + incident grounding as a downloadable dataset.
- **Lead with the governance analyst** — that's where the data is strongest and the use case is most obviously real.

---

## 4. System design for the mitigation feature

### 4.1 Data model (existing §5 tables + small additions)
```sql
mitigation_action(id, action_id, name, definition, source, mitigation_code, group_no, embedding)
   -- imported from the CSV; mitigation_code = subcategory, e.g. '2.4 Content Safety Controls'

-- THE crosswalk — the core intellectual artifact, built once, at SUBCATEGORY level
risk_mitigation_map(
   id PK,
   risk_subdomain_id  FK → risk_subdomain,
   mitigation_code,                 -- one of the 23 subcategory codes
   relevance          SMALLINT,     -- 0–3 (none / weak / moderate / strong)
   rationale          TEXT,         -- WHY this family addresses this risk
   mapped_by          TEXT,         -- 'llm' | 'human'
   reviewed           BOOL
)
```
- Scale: **~24 subdomains × 23 subcategories ≈ 550 cells**, most are 0. Only the non-zero pairs need a rationale → a few hundred. Built **once**, not per incident.
- The original per-incident `incident_mitigation` link becomes **optional/automatic**: an incident inherits control families from its classification via the crosswalk. Per-incident semantic ranking is only needed if you want to surface the *specific* top actions on an incident detail page.

### 4.2 Building the crosswalk (the key step)
- LLM-assisted, human-reviewed. For each (risk subdomain × mitigation subcategory) pair, prompt the LLM (strict JSON out) with the subdomain + its definition and the control family + example actions:
  ```
  Q: To what degree does this control family address this risk?
  → { relevance: 0-3, rationale: "<one sentence grounded in the control's purpose>" }
  ```
- Run across all pairs (a few hundred one-time cheap calls), dump to a review UI, sanity-check the non-zero rows, set `reviewed=true`.
- **The reviewed crosswalk is itself a presentable deliverable** — "an empirically-organised risk-to-control mapping across 10 frameworks."

### 4.3 Aggregation queries (most of the feature is JOIN + GROUP BY — no ML at query time)
- **Crosswalk for a risk (panel a/b):** `risk_mitigation_map ⋈ mitigation_action` filtered by subdomain, `relevance > 0`, grouped by `mitigation_code`, aggregating action counts + distinct `source`.
- **Incident grounding (panel c):** `risk_mitigation_map ⋈ incident_classification ⋈ incident`.
- **Coverage matrix (panel d):** `GROUP BY (risk_subdomain, source)`.

### 4.4 API
```
GET  /api/risks/:subdomainId/controls    → ranked families + their actions (panels a+b)
GET  /api/risks/:subdomainId/incidents   → grounding incidents (panel c)
GET  /api/coverage-matrix                → risk × framework grid (panel d)
POST /api/controls/:id/feedback          → analyst thumbs up/down (optional refinement)
```

### 4.5 Frontend
- Risk picker (reuse taxonomy filters) · ranked dot/bar list of control families · expandable action list with source badges · the risk × framework coverage heatmap · an export (CSV/PDF) button.

### 4.6 Where it lands in the phased plan
- Build the crosswalk in **Phase 5** (Mitigation engine); add the Coverage Explorer screen alongside the **Phase 6** dashboards. It consumes Phase 2 classifications; **no new infrastructure**.

---

## 5. Architecture review — what was wrong with the first sketch

The initial Excalidraw sketch captured the *happy path* correctly (scrape → raw report → LLM extraction → embed/match/dedup/classify/mitigate → Postgres; separate Admin/User dashboards; Scraper/Analytics/RAG APIs) but had these issues:

**Correctness / clarity:**
1. **LLM under-connected** — the dedup/classification/mitigation steps are LLM calls but had no arrow to the LLM. Only extraction + RAG touched it.
2. **RAG query embedding implicit** — semantic search must embed the user's query before the vector search.
3. Spelling: "Scrapper" → "Scraper".

**Missing pieces (ranked by importance):**
1. **Relevance gate** — the two-stage filter (keyword prefilter → LLM "is this a real AI incident?") that belongs *before* extraction (§8.2). The sketch sent every raw report straight to the LLM.
2. **Human-in-the-loop review queue (F10)** — low-confidence relevance/dedup/classification items must route to a human, not enter the KB silently.
3. **Scheduler/cron** — the decided default ("cron is the backbone, manual is the override," §8.8). The sketch only had a manual button.
4. **Source management (F8)** — the Scraper needs a managed source list; in the sketch sources appeared from nowhere.
5. **Initial AIID data seed (Phase 0)** — the one-time import of 1,498 incidents / 7,143 reports / 831 controls / taxonomies. The sketch was all live-ingestion and implied an empty DB.
6. **Admin dashboard too thin** — needs source management, run history/status, and the review queue, not just a "Scrape" button.

---

## 6. The corrected high-level architecture

Rendered as `AIRiskWatch_Architecture.html`. The whole system as a single top-to-bottom flow:

```
01  SOURCES & TRIGGERS     Scheduler (cron, daily) · Manual trigger (admin) · Web sources (RSS/HTML)
02  INGESTION              Scraper (fetch + clean text + url-dedupe) → Relevance gate [keyword → ✦LLM, ⤴review]
03  RESOLUTION & ENRICH    Structured extraction [✦LLM] → Embed & match [pgvector] →
                           Same-incident adjudication [✦LLM, ⤴review] →
                           Multi-taxonomy classification [✦LLM, ⤴review] → Mitigation crosswalk [risk→control map]
    ── cross-cutting ──    LLM (single structured-output model) · Review queue (human-in-the-loop)
04  KNOWLEDGE BASE         PostgreSQL + pgvector  (incidents · reports · entities · relationships ·
                           classifications · mitigations · risk→control map · embeddings)
                           ← one-time Seed importer: AIID corpus + MIT/CSET/GMF taxonomies + 831-control framework
05  SERVING APIs           Analytics API (trends + gap analysis) · Semantic search/RAG [embed query → ✦LLM] · Admin API
06  EXPERIENCE             User dashboard (Policymaker / Developer / Researcher views) · Admin dashboard (sources · runs · review queue)
```

**Legend conventions used in the diagram:**
- `✦ LLM` — a step that calls the structured-output model (strict JSON schema).
- `⤴ review` — a step whose low-confidence output can route to the human review queue.
- **Amber** = live signal / active flow / every LLM touchpoint. **Teal** = data layer, framework crosswalk, human review. Neutral/`data` chips = deterministic steps (plain code/SQL, no model call).
- The seed import happens **once**; scraping **grows** the KB afterwards.

---

## 7. Open follow-ups (not yet done)
- Draft the crosswalk-builder LLM prompt + the review-UI spec.
- Optionally replace the weak §8.5 in `AIRiskWatch_Spec_And_Plan.md` with the reframed mitigation design (§3–§4 above).
- Optional: a compliance lens (map controls → EU AI Act obligations) — higher ambition, evaluate against timeline before committing.
- Optional: inline the fonts in `AIRiskWatch_Architecture.html` for a fully self-contained / offline / PDF-export version.

## 8. Key reference numbers (for quick recall)
- **1,498** incidents · **7,143** reports (avg ~4/incident) · **1,242** MIT-labelled (the eval gold set) · **831** mitigation controls · **7** MIT risk domains · **23** mitigation subcategories · **~10** frameworks unified.
- MIT risk domains by incident count: Malicious Actors & Misuse (424) · AI system safety/failures (282) · Discrimination & Toxicity (230) · Misinformation (159) · Privacy & Security (95) · Human-Computer Interaction (33) · Socioeconomic & Environmental (19).
