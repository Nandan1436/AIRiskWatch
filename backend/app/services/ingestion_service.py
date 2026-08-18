"""News ingestion pipeline (Phase 4+7 merged, per the Aug-1 design decisions).

Five stages per article, one function each so they can be exercised
independently, plus ``run_ingestion_cycle`` to orchestrate them:

  1. Discover      feed fetch + parse, skip URLs already in ``report``
  2. Relevance     LLM call #1 — is this actually an AI incident?
  3. Report        article fetch + body extraction + LLM call #2 (prose fields)
  4. Resolution    embedding cosine match against existing incidents (no LLM)
  5a. Attach       matched: link the report to that incident
  5b. Create       unmatched: LLM call #3 (incident fields) + #4 (classification)

Adds no tables and no migration: everything lands in the existing ``incident`` /
``report`` / ``incident_report`` / ``mit_classification`` tables. Run outcomes
are returned as an in-memory summary and logged, never persisted.

Two invariants worth stating up front, because both are easy to quietly break:

- **The advisory lock is load-bearing.** New ``report_number`` / ``incident_id``
  values are allocated with ``MAX(...) + 1`` rather than a sequence, so the lock
  is what prevents two cycles from picking the same id. Removing it requires
  moving id allocation back to real sequences first.
- **The LLM never supplies provenance.** ``url`` and ``source_domain`` come from
  the feed entry; the model is asked only for prose. A model that hallucinated a
  plausible-looking source would otherwise poison attribution silently.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import func, insert, select, text as sql_text
from sqlalchemy.orm import Session

from app import config
from app.core import feed_client
from app.core.embedding_client import embed_text, incident_embedding_input
from app.core.llm_client import LlmClient, LlmClientError, create_llm_client
from app.core.news_sources import NEWS_SOURCES, NewsSource
from app.models.incident_model import Incident, incident_report_table
from app.models.report_model import Report
from app.services.llm_classification_service import LlmClassificationService

logger = logging.getLogger(__name__)

# Arbitrary but fixed: the key identifying this pipeline's advisory lock. Any
# other advisory-lock user in this database must not reuse it.
_ADVISORY_LOCK_KEY = 8_401_207

# Budget for the text handed to the LLM. The stored text is NOT truncated (see
# report.text); this only bounds prompt cost.
_PROMPT_TEXT_CHAR_LIMIT = 6000
_SUMMARY_PROMPT_CHAR_LIMIT = 1200
# Body-text budget when building the dedup query vector. Kept near the
# description budget the Phase 2 classifier uses (2500), so the query vector is
# comparable in scope to the stored title+description vectors.
_RESOLUTION_TEXT_CHAR_LIMIT = 2500

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\f\v]+")


class IngestionError(RuntimeError):
    """A failure that aborts one article or one source, never the whole cycle."""


# --------------------------------------------------------------------------
# Run summary — returned and logged, never stored
# --------------------------------------------------------------------------
@dataclass
class IngestionRunSummary:
    """Outcome of one ingestion cycle.

    ``articles_failed`` is tracked separately from
    ``articles_seen - articles_relevant`` because those two are very different
    outcomes: "89 irrelevant, 1 failed" and "40 irrelevant, 50 failed" would
    otherwise be indistinguishable.
    """

    status: str = "running"  # running | completed | partial | failed | skipped
    sources_processed: int = 0
    articles_seen: int = 0
    articles_relevant: int = 0
    articles_failed: int = 0
    incidents_created: int = 0
    reports_attached: int = 0
    errors: list[str] = field(default_factory=list)

    def record_error(self, message: str) -> None:
        logger.warning("ingestion error: %s", message)
        self.errors.append(message)

    def finalize(self) -> "IngestionRunSummary":
        if self.status not in ("running",):
            return self
        self.status = "partial" if self.errors else "completed"
        return self


# --------------------------------------------------------------------------
# Validated LLM outputs
# --------------------------------------------------------------------------
class RelevanceVerdict(BaseModel):
    """Stage 2 output — the gate that keeps AI *news* out of an AI *incident*
    corpus."""

    is_incident: bool
    harm_type: str = ""
    ai_system: str = ""
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = ""

    def accepted(self, min_confidence: float) -> bool:
        """A yes counts only if the model is confident AND can name both the
        harm and the system. A hedged or unspecific yes is treated as a no:
        a false positive pollutes the corpus, a false negative just means we
        miss one article that the next run may pick up anyway."""
        if not self.is_incident:
            return False
        if self.confidence < min_confidence:
            return False
        return bool(self.harm_type.strip()) and bool(self.ai_system.strip())


class ReportFields(BaseModel):
    """Stage 3 output — prose only. Provenance fields are deliberately absent
    from this model so they cannot be sourced from the LLM at all."""

    title: str = ""
    authors: str = ""
    language: str = "en"

    @field_validator("title", "authors", "language", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> str:
        if v is None:
            return ""
        if isinstance(v, list):
            return ", ".join(str(item).strip() for item in v if str(item).strip())
        return str(v)


class IncidentFields(BaseModel):
    """Stage 5b output — the fields needed to open a new incident."""

    title: str
    description: str
    incident_date: date | None = None
    alleged_deployer: list[str] = Field(default_factory=list)
    alleged_developer: list[str] = Field(default_factory=list)
    harmed_parties: list[str] = Field(default_factory=list)

    @field_validator("incident_date", mode="before")
    @classmethod
    def _parse_date(cls, v: Any) -> date | None:
        if not v or not isinstance(v, str):
            return None
        try:
            return date.fromisoformat(v.strip()[:10])
        except ValueError:
            return None

    @field_validator(
        "alleged_deployer", "alleged_developer", "harmed_parties", mode="before"
    )
    @classmethod
    def _coerce_list(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            v = [v]
        if not isinstance(v, list):
            return []
        return [str(item).strip() for item in v if str(item).strip()]


# --------------------------------------------------------------------------
# Prompts
# --------------------------------------------------------------------------
# The central problem this prompt solves: an AI-category feed is mostly funding
# rounds, product launches, and benchmark results. A model asked "is this about
# AI?" says yes to nearly all of it. So the definition is narrow, the exclusions
# are explicit and enumerated, and the model must name a concrete harm and a
# concrete deployed system — requirements that are hard to satisfy for an
# article that isn't actually about an incident.
_RELEVANCE_SYSTEM = (
    "You screen news articles for an AI incident database. Your job is to "
    "decide whether an article reports a REAL AI INCIDENT that has already "
    "happened.\n\n"
    "An AI incident REQUIRES all three of:\n"
    "1. A specific, identifiable AI or automated system that was actually "
    "deployed or used in the real world.\n"
    "2. A concrete harm, failure, or wrongdoing that ALREADY OCCURRED — not a "
    "risk, forecast, or possibility.\n"
    "3. Identifiable affected parties: named people, a group, an organization, "
    "or the public.\n\n"
    "Answer is_incident=false for all of these, however AI-related they are:\n"
    "- Funding rounds, acquisitions, valuations, hiring, executive changes\n"
    "- Product launches, model releases, feature announcements, demos — INCLUDING "
    "launches of AI safety or AI security products\n"
    "- Benchmark results, capability claims, research papers with no deployed harm\n"
    "- Security vulnerabilities, exploits, or attacks carried out by humans using "
    "conventional means, even when the target is an AI product. The AI must be the "
    "thing that CAUSED the harm, not the thing that was attacked.\n"
    "- Red-team findings, researcher demonstrations, proof-of-concept jailbreaks, "
    "and bug-bounty writeups where the only 'victim' was the researcher's own test\n"
    "- Analysis, retrospectives, or explainers ABOUT an earlier incident, rather "
    "than reporting of the incident itself\n"
    "- Opinion, commentary, editorials, predictions, 'could'/'may'/'risks that' pieces\n"
    "- Proposed legislation, regulatory consultations, policy debate with no incident\n"
    "- Explainers, how-to guides, listicles, reviews, interviews\n"
    "- Lawsuits or investigations where the underlying harm is not described\n"
    "- Purely financial or market impact with no harm to people\n\n"
    "Answer is_incident=true for, e.g.: a deployed model that produced "
    "discriminatory decisions; a chatbot that gave dangerous advice to a real "
    "user; a self-driving vehicle collision; facial recognition causing a "
    "wrongful arrest; a deepfake used to defraud someone; a system that leaked "
    "personal data; AI-generated content that caused documented harm.\n\n"
    "Be strict. A false positive corrupts the database; a false negative merely "
    "misses one article. If the article is ambiguous, or if the harm is only "
    "potential, answer false.\n\n"
    "GROUND EVERY FIELD IN THE HEADLINE AND SUMMARY YOU ARE GIVEN. Judge only "
    "that one article. Do not use knowledge of other articles or other incidents. "
    "The system you name in ai_system MUST appear in the text you are given — if "
    "you cannot point to it there, answer is_incident=false. If the harm and the "
    "system come from different stories, answer false.\n\n"
    "Fields:\n"
    "- is_incident: boolean, per the rules above.\n"
    "- harm_type: if true, the concrete harm in 2-6 words (e.g. 'wrongful "
    "arrest', 'discriminatory loan denial'). Empty string if false.\n"
    "- ai_system: if true, the specific system or product named IN THIS ARTICLE "
    "that caused the harm (e.g. 'Tesla Autopilot', 'Amazon hiring algorithm'). "
    "Empty string if false.\n"
    "- confidence: 0 to 1, how confident you are in is_incident.\n"
    "- reason: one sentence justifying the decision, quoting the specific words "
    "from the headline or summary that establish the harm.\n\n"
    "Reply with ONLY a JSON object with keys: is_incident, harm_type, "
    "ai_system, confidence, reason."
)

_RELEVANCE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "is_incident": {"type": "boolean"},
        "harm_type": {"type": "string"},
        "ai_system": {"type": "string"},
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
    "required": ["is_incident", "harm_type", "ai_system", "confidence", "reason"],
    "propertyOrdering": [
        "is_incident",
        "harm_type",
        "ai_system",
        "confidence",
        "reason",
    ],
}

_REPORT_SYSTEM = (
    "You extract bibliographic metadata from a news article for an incident "
    "database. Extract ONLY what is present in the text you are given.\n\n"
    "Fields:\n"
    "- title: the article's headline, cleaned of site name and separators.\n"
    "- authors: the byline as a comma-separated string. Empty string if the "
    "text does not state an author. Never guess a name.\n"
    "- language: ISO 639-1 code of the article's language (e.g. 'en').\n\n"
    "Do not summarize, editorialize, or add fields. Do not infer a URL, "
    "publication, or domain — those are supplied separately and are not your "
    "concern.\n\n"
    "Reply with ONLY a JSON object with keys: title, authors, language."
)

_REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "authors": {"type": "string"},
        "language": {"type": "string"},
    },
    "required": ["title", "authors", "language"],
    "propertyOrdering": ["title", "authors", "language"],
}

_INCIDENT_SYSTEM = (
    "You write structured incident records for an AI incident database, in the "
    "style of the AI Incident Database (AIID). You are given one news article "
    "describing an AI incident.\n\n"
    "Fields:\n"
    "- title: a neutral, factual one-line description of the incident itself "
    "(NOT the article's headline). Name the system and the harm. No "
    "sensationalism, no clickbait punctuation.\n"
    "- description: 2-4 sentences stating what the system did, who was "
    "affected, and the outcome. Only facts present in the article.\n"
    "- incident_date: when the incident occurred, as YYYY-MM-DD. Use the "
    "article's own date only if the incident clearly happened then. Empty "
    "string if the article does not say.\n"
    "- alleged_deployer: organizations that DEPLOYED or operated the system.\n"
    "- alleged_developer: organizations that BUILT the system. May be the same "
    "as the deployer; may be empty if unstated.\n"
    "- harmed_parties: who was harmed — specific groups or categories of "
    "people, not individual names.\n\n"
    "Rules: never invent an organization, date, or harm not stated in the "
    "article. Prefer an empty list over a guess. Use the organizations' common "
    "names.\n\n"
    "Reply with ONLY a JSON object with keys: title, description, "
    "incident_date, alleged_deployer, alleged_developer, harmed_parties."
)

_INCIDENT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "incident_date": {"type": "string"},
        "alleged_deployer": {"type": "array", "items": {"type": "string"}},
        "alleged_developer": {"type": "array", "items": {"type": "string"}},
        "harmed_parties": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "description", "incident_date"],
    "propertyOrdering": [
        "title",
        "description",
        "incident_date",
        "alleged_deployer",
        "alleged_developer",
        "harmed_parties",
    ],
}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def strip_html(value: str | None) -> str:
    """Flatten an HTML fragment to plain text. RSS summaries routinely carry
    markup, and storing it would leak into every consumer of ``report.text``."""
    if not value:
        return ""
    without_tags = _TAG_RE.sub(" ", value)
    unescaped = (
        without_tags.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    collapsed = _WS_RE.sub(" ", unescaped)
    return "\n".join(line.strip() for line in collapsed.splitlines() if line.strip()).strip()


def _truncate(value: str, limit: int) -> str:
    value = value.strip()
    return value if len(value) <= limit else value[:limit].rstrip() + "…"


def _entry_published_date(entry: feed_client.FeedEntry) -> date | None:
    parsed = entry.published_date
    if parsed is None:
        return None
    try:
        return date(parsed.tm_year, parsed.tm_mon, parsed.tm_mday)
    except (AttributeError, ValueError):
        return None


def _next_id(db: Session, column) -> int:
    """Allocate the next public id for ``column`` as ``MAX + 1``.

    Safe only because the whole cycle holds the advisory lock — see the module
    docstring. Sequences were deliberately not introduced (no migration), so
    this is the tradeoff that buys that.
    """
    current = db.scalar(select(func.coalesce(func.max(column), 0)))
    return int(current or 0) + 1


# --------------------------------------------------------------------------
# Stage 1 — Discover
# --------------------------------------------------------------------------
def discover_articles(
    db: Session,
    source: NewsSource,
    seen_urls: set[str] | None = None,
) -> list[feed_client.FeedEntry]:
    """New articles from one feed, already-known URLs filtered out.

    ``seen_urls`` is the cycle-wide set of URLs already claimed by this run.
    It matters because feeds overlap: a syndicated wire story, or two feeds that
    redirect to one canonical URL, can present the same article from different
    sources within a single cycle. Without a cycle-scoped set, the DB check alone
    would miss it — the first copy may not be committed yet when the second is
    discovered — and ``report.url`` deliberately carries no UNIQUE constraint to
    catch it either. Callers that don't pass one get per-source behaviour only.

    Raises ``FeedFetchError`` on a feed-level problem so the caller can record a
    source failure and continue with the remaining sources.
    """
    raw = feed_client.fetch_feed(source)
    entries = feed_client.parse_feed_entries(raw, source)

    if seen_urls is None:
        seen_urls = set()

    fresh: list[feed_client.FeedEntry] = []
    for entry in entries:
        if len(fresh) >= config.INGESTION_MAX_ARTICLES_PER_SOURCE:
            break
        if entry.url in seen_urls:
            continue
        if _report_url_exists(db, entry.url):
            continue
        seen_urls.add(entry.url)
        fresh.append(entry)

    logger.info(
        "discover: source=%s entries=%d new=%d",
        source.name,
        len(entries),
        len(fresh),
    )
    return fresh


def _report_url_exists(db: Session, url: str) -> bool:
    """Idempotency check. ``report.url`` cannot carry a UNIQUE constraint — the
    seeded AIID corpus already contains duplicate URLs — so this
    application-level check is what makes re-running a cycle a no-op."""
    return (
        db.scalar(select(Report.id).where(Report.url == url).limit(1)) is not None
    )


# --------------------------------------------------------------------------
# Stage 2 — Relevance filter (LLM call #1)
# --------------------------------------------------------------------------
def filter_relevance(client: LlmClient, entry: feed_client.FeedEntry) -> RelevanceVerdict:
    """Screen one article on its feed metadata alone.

    Runs before any article-page fetch, so an irrelevant article costs one small
    LLM call and no HTTP request.
    """
    summary = _truncate(strip_html(entry.summary), _SUMMARY_PROMPT_CHAR_LIMIT)
    user = (
        f"Source: {entry.source_name}\n"
        f"Headline: {entry.title or '(none)'}\n"
        f"Summary: {summary or '(none)'}\n\n"
        "Decide whether this reports a real AI incident. Answer:"
    )
    try:
        raw = client.complete_json(_RELEVANCE_SYSTEM, user, _RELEVANCE_SCHEMA)
    except LlmClientError as exc:
        raise IngestionError(f"relevance check failed: {exc}") from exc

    try:
        return RelevanceVerdict.model_validate(raw)
    except ValidationError as exc:
        raise IngestionError(f"relevance response invalid: {exc}") from exc


# --------------------------------------------------------------------------
# Stage 3 — Report extraction (article fetch + LLM call #2)
# --------------------------------------------------------------------------
def fetch_body_text(entry: feed_client.FeedEntry) -> tuple[str, bool]:
    """The article's body text, and whether we had to fall back to the summary.

    Full body text is stored by requirement. When the page can't be fetched or
    parsed, the feed summary stands in — degraded, logged, but still a usable
    report rather than a lost one.
    """
    html = feed_client.fetch_article(entry.url)
    if html is not None:
        extracted = feed_client.extract_article_text(html, url=entry.url)
        if extracted:
            return extracted, False

    logger.info(
        "extract: source=%s url=%s fallback=summary",
        entry.source_name,
        entry.url,
    )
    return strip_html(entry.summary), True


def extract_report_fields(
    client: LlmClient, entry: feed_client.FeedEntry, body_text: str
) -> ReportFields:
    """Prose metadata for the report row.

    Note what is NOT requested: ``url`` and ``source_domain``. Those come from
    the feed entry, so no model output can misattribute a report.
    """
    user = (
        f"Headline as published: {entry.title or '(none)'}\n\n"
        f"Article text:\n{_truncate(body_text, _PROMPT_TEXT_CHAR_LIMIT)}\n\n"
        "Extract the metadata. Answer:"
    )
    try:
        raw = client.complete_json(_REPORT_SYSTEM, user, _REPORT_SCHEMA)
    except LlmClientError as exc:
        raise IngestionError(f"report extraction failed: {exc}") from exc

    try:
        fields = ReportFields.model_validate(raw)
    except ValidationError as exc:
        raise IngestionError(f"report response invalid: {exc}") from exc

    # The feed's own headline is the fallback — never leave a report untitled.
    if not fields.title.strip():
        fields.title = entry.title or entry.url
    return fields


# --------------------------------------------------------------------------
# Stage 4 — Incident resolution (embedding only, no LLM call)
# --------------------------------------------------------------------------
def resolve_incident(
    db: Session, title: str, description: str
) -> tuple[int | None, float]:
    """Best-matching existing incident, if any, for a normalized incident record.

    Takes an incident-shaped title + description (not raw article prose) and
    embeds it exactly the way stored incidents were embedded, via
    ``incident_embedding_input``. That symmetry is the point: the same real-world
    event covered by two outlets yields two very different articles but two
    nearly identical incident records, so matching in normalized space is what
    makes the threshold meaningful.

    Uses the same distance convention as ``SearchService.retrieve``
    (``cosine_distance``, reported as ``1 - distance``) so a similarity value
    means the same thing in ingestion as it does in search.
    """
    query_text = incident_embedding_input(
        title, _truncate(description, _RESOLUTION_TEXT_CHAR_LIMIT)
    )
    if not query_text.strip():
        return None, 0.0

    query_vector = embed_text(query_text)
    distance = Incident.embedding.cosine_distance(query_vector)
    row = db.execute(
        select(Incident.incident_id, distance.label("distance"))
        .where(Incident.embedding.is_not(None))
        .order_by(distance)
        .limit(1)
    ).first()
    if row is None:
        return None, 0.0

    incident_id, dist = row
    similarity = 1.0 - float(dist)
    if similarity >= config.INGESTION_SIMILARITY_THRESHOLD:
        return int(incident_id), similarity
    return None, similarity


# --------------------------------------------------------------------------
# Stage 5 — persistence
# --------------------------------------------------------------------------
def _insert_report(
    db: Session,
    entry: feed_client.FeedEntry,
    fields: ReportFields,
    body_text: str,
) -> int:
    """Insert the report row and return its ``report_number``.

    ``url`` and ``source_domain`` come from the feed entry — the trust boundary.
    ``text`` holds the full body, untruncated.
    """
    report_number = _next_id(db, Report.report_number)
    db.add(
        Report(
            report_number=report_number,
            title=fields.title or entry.title,
            text=body_text,
            url=entry.url,
            source_domain=entry.source_domain,
            authors=fields.authors or None,
            published_date=_entry_published_date(entry),
            language=fields.language or "en",
        )
    )
    db.flush()
    return report_number


def _link_report(db: Session, incident_id: int, report_number: int) -> None:
    db.execute(
        insert(incident_report_table).values(
            incident_id=incident_id, report_id=report_number
        )
    )


def attach_to_incident(
    db: Session,
    entry: feed_client.FeedEntry,
    fields: ReportFields,
    body_text: str,
    incident_id: int,
) -> None:
    """Branch A — the article corroborates an incident already in the corpus."""
    report_number = _insert_report(db, entry, fields, body_text)
    _link_report(db, incident_id, report_number)
    db.commit()
    logger.info(
        "attach: url=%s report_number=%d incident_id=%d",
        entry.url,
        report_number,
        incident_id,
    )


def extract_incident_fields(
    client: LlmClient, entry: feed_client.FeedEntry, body_text: str
) -> IncidentFields:
    """LLM call #3 — the structured incident record for a new incident."""
    user = (
        f"Article headline: {entry.title or '(none)'}\n"
        f"Published: {_entry_published_date(entry) or 'unknown'}\n\n"
        f"Article text:\n{_truncate(body_text, _PROMPT_TEXT_CHAR_LIMIT)}\n\n"
        "Write the incident record. Answer:"
    )
    try:
        raw = client.complete_json(_INCIDENT_SYSTEM, user, _INCIDENT_SCHEMA)
    except LlmClientError as exc:
        raise IngestionError(f"incident extraction failed: {exc}") from exc

    try:
        incident_fields = IncidentFields.model_validate(raw)
    except ValidationError as exc:
        raise IngestionError(f"incident response invalid: {exc}") from exc

    if not incident_fields.title.strip() or not incident_fields.description.strip():
        raise IngestionError("incident response missing title or description")
    return incident_fields


def create_incident(
    db: Session,
    client: LlmClient,
    entry: feed_client.FeedEntry,
    fields: ReportFields,
    body_text: str,
    incident_fields: IncidentFields,
    summary: IngestionRunSummary,
) -> int:
    """Branch B — open a new incident, then classify it.

    The incident and report are committed BEFORE classification is attempted, so
    a classification failure cannot roll them back. An unclassified incident is
    recoverable (``scripts/run_classification.py`` backfills it); a lost one is
    not.
    """
    incident_id = _next_id(db, Incident.incident_id)
    embedding_input = incident_embedding_input(
        incident_fields.title, incident_fields.description
    )
    db.add(
        Incident(
            incident_id=incident_id,
            title=incident_fields.title,
            description=incident_fields.description,
            incident_date=incident_fields.incident_date
            or _entry_published_date(entry),
            alleged_deployer=incident_fields.alleged_deployer or None,
            alleged_developer=incident_fields.alleged_developer or None,
            harmed_parties=incident_fields.harmed_parties or None,
            embedding=embed_text(embedding_input) if embedding_input else None,
        )
    )
    db.flush()

    report_number = _insert_report(db, entry, fields, body_text)
    _link_report(db, incident_id, report_number)
    db.commit()
    logger.info(
        "create: url=%s incident_id=%d report_number=%d",
        entry.url,
        incident_id,
        report_number,
    )

    # LLM call #4 — reuses the Phase 2 service as-is rather than duplicating
    # taxonomy logic. Deliberately outside the transaction above.
    #
    # Catches BaseException-minus-the-unrecoverable rather than just the two
    # expected error types: the incident and report are already committed at this
    # point, so anything escaping here would be attributed to the article by the
    # caller's handler — counting a stored incident as a failed one and rolling
    # back a transaction that no longer contains it. A missing classification is
    # recoverable (scripts/run_classification.py backfills it); a miscounted run
    # and a bogus rollback are not.
    try:
        service = LlmClassificationService(db, client)
        result = service.classify_incident(incident_id)
        service.save_llm_classification(incident_id, result)
    except KeyboardInterrupt:
        raise
    except Exception as exc:
        # save_llm_classification commits, so a failure there may leave the
        # session dirty; clear it before the caller reuses this session.
        db.rollback()
        summary.record_error(
            f"incident {incident_id} created but not classified: "
            f"{type(exc).__name__}: {exc}"
        )

    return incident_id


# --------------------------------------------------------------------------
# Per-article pipeline
# --------------------------------------------------------------------------
def process_article(
    db: Session,
    client: LlmClient,
    entry: feed_client.FeedEntry,
    summary: IngestionRunSummary,
) -> None:
    """Stages 2-5 for one article. Raises ``IngestionError`` on failure; the
    caller counts it and moves to the next article."""
    verdict = filter_relevance(client, entry)
    if not verdict.accepted(config.INGESTION_RELEVANCE_MIN_CONFIDENCE):
        logger.info(
            "relevance: url=%s rejected is_incident=%s confidence=%.2f reason=%s",
            entry.url,
            verdict.is_incident,
            verdict.confidence,
            verdict.reason,
        )
        return

    summary.articles_relevant += 1
    logger.info(
        "relevance: url=%s accepted harm=%r system=%r confidence=%.2f",
        entry.url,
        verdict.harm_type,
        verdict.ai_system,
        verdict.confidence,
    )

    body_text, used_fallback = fetch_body_text(entry)
    if not body_text.strip():
        raise IngestionError(f"no usable text for {entry.url}")

    fields = extract_report_fields(client, entry, body_text)

    # Re-check for the URL: the relevance + extraction calls take time, and a
    # concurrent CLI run could have inserted it. Cheap insurance against a
    # duplicate report.
    if _report_url_exists(db, entry.url):
        logger.info("skip: url=%s inserted_concurrently", entry.url)
        return

    # Normalize the article into incident form BEFORE resolving. Stored
    # ``incident.embedding`` vectors are built from an incident's title +
    # description, so comparing raw article prose against them is
    # apples-to-oranges and loses real matches: two outlets covering one
    # incident write very different articles, but the normalized records they
    # produce are nearly identical. Costs one LLM call on the attach path that
    # a resolve-first ordering would save, which is the price of the dedup
    # actually working.
    incident_fields = extract_incident_fields(client, entry, body_text)

    incident_id, similarity = resolve_incident(
        db, incident_fields.title, incident_fields.description
    )
    if incident_id is not None:
        attach_to_incident(db, entry, fields, body_text, incident_id)
        summary.reports_attached += 1
        logger.info(
            "resolve: url=%s matched incident_id=%d similarity=%.4f%s",
            entry.url,
            incident_id,
            similarity,
            " (summary fallback)" if used_fallback else "",
        )
        return

    create_incident(
        db, client, entry, fields, body_text, incident_fields, summary
    )
    summary.incidents_created += 1
    logger.info(
        "resolve: url=%s no match (best similarity=%.4f) -> new incident%s",
        entry.url,
        similarity,
        " (summary fallback)" if used_fallback else "",
    )


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------
def _try_advisory_lock(connection) -> bool:
    """Take the pipeline's advisory lock on a specific connection.

    Takes a ``Connection``, not a ``Session``, on purpose. ``pg_advisory_lock``
    belongs to one Postgres backend, and a Session does not pin one: after a
    ``commit()`` it returns its connection to the pool, and if anything else
    checks out in that window the Session continues on a *different* backend.
    The lock would then be stranded on an idle pooled connection — silently
    ending mutual exclusion (which is what makes ``MAX(id) + 1`` safe) and
    leaving a lock nothing can release, so every later cycle reports
    ``skipped`` until the process restarts.
    """
    return bool(
        connection.execute(
            sql_text("SELECT pg_try_advisory_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
    )


def _release_advisory_lock(connection) -> None:
    """Release the lock on the same connection that took it.

    A ``False`` result means we did not own the lock — the bug this signature
    exists to prevent — so it is logged as an error rather than ignored.
    """
    try:
        released = connection.execute(
            sql_text("SELECT pg_advisory_unlock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
        if not released:
            logger.error(
                "advisory lock %s was not held by this connection at release; "
                "it may be stranded on another pooled connection",
                _ADVISORY_LOCK_KEY,
            )
    except Exception as exc:  # pragma: no cover - best-effort release
        logger.warning("failed to release advisory lock: %s", exc)


def run_ingestion_cycle(
    db: Session,
    client: LlmClient | None = None,
    sources: tuple[NewsSource, ...] = NEWS_SOURCES,
) -> IngestionRunSummary:
    """Run one full ingestion cycle over ``sources``.

    Serialized by a Postgres advisory lock: a second concurrent call returns
    immediately with ``status='skipped'`` rather than blocking or racing. That
    lock also protects ``MAX(id) + 1`` allocation, so it is not optional.

    The cycle runs on a connection checked out for its whole duration, with a
    Session bound to that connection, so the lock, every commit, and the release
    all happen on one Postgres backend. The caller's ``db`` session is used only
    to reach the engine — it is deliberately not the session the work runs on
    (see ``_try_advisory_lock`` for why).
    """
    summary = IngestionRunSummary()
    engine = db.get_bind()

    with engine.connect() as connection:
        if not _try_advisory_lock(connection):
            summary.status = "skipped"
            logger.info("ingestion: lock held elsewhere, skipping this cycle")
            return summary
        try:
            with Session(bind=connection) as work_db:
                return _run_locked_cycle(work_db, client, sources, summary)
        finally:
            _release_advisory_lock(connection)


def _run_locked_cycle(
    db: Session,
    client: LlmClient | None,
    sources: tuple[NewsSource, ...],
    summary: IngestionRunSummary,
) -> IngestionRunSummary:
    """The cycle body, with the advisory lock already held for its duration."""

    started = datetime.now(timezone.utc)
    owns_client = client is None
    try:
        # Only client CONSTRUCTION is fatal to the cycle (a missing API key means
        # no article can be processed). Per-call LLM errors are wrapped into
        # IngestionError by each stage and handled per-article below, so one API
        # hiccup never discards the remaining sources.
        if client is None:
            try:
                client = create_llm_client()
            except LlmClientError as exc:
                summary.status = "failed"
                summary.record_error(f"LLM client unavailable: {exc}")
                sources = ()  # nothing can be processed; fall through to cleanup

        # URLs claimed anywhere in this cycle, so overlapping feeds can't each
        # ingest the same article (see discover_articles).
        seen_urls: set[str] = set()

        for source in sources:
            try:
                entries = discover_articles(db, source, seen_urls)
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                # Any source-level failure (bad feed URL, robots denial, non-2xx,
                # malformed XML) is recorded and skipped; the remaining sources
                # still run. FeedFetchError already names the source, so don't
                # prefix it twice.
                message = str(exc)
                if not message.startswith(f"{source.name}:"):
                    message = f"{source.name}: {message}"
                summary.record_error(message)
                continue

            summary.sources_processed += 1
            for entry in entries:
                summary.articles_seen += 1
                try:
                    process_article(db, client, entry, summary)
                except KeyboardInterrupt:
                    raise
                except Exception as exc:
                    db.rollback()
                    summary.articles_failed += 1
                    summary.record_error(f"{source.name} {entry.url}: {exc}")

    except KeyboardInterrupt:
        summary.status = "failed"
        summary.record_error("interrupted")
    except Exception as exc:
        # Nothing should reach here — source and article failures are both
        # handled above — but a cycle that dies for an unforeseen reason must
        # still report it and release the lock rather than raise into a
        # scheduler job or HTTP handler.
        summary.status = "failed"
        summary.record_error(f"cycle aborted: {type(exc).__name__}: {exc}")
        logger.exception("ingestion cycle aborted")
    finally:
        # The advisory lock is released by run_ingestion_cycle, which owns the
        # connection it was taken on.
        if owns_client and client is not None:
            close = getattr(client, "close", None)
            if callable(close):
                close()

    summary.finalize()
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    logger.info(
        "run: status=%s elapsed=%.1fs sources=%d seen=%d relevant=%d failed=%d "
        "created=%d attached=%d",
        summary.status,
        elapsed,
        summary.sources_processed,
        summary.articles_seen,
        summary.articles_relevant,
        summary.articles_failed,
        summary.incidents_created,
        summary.reports_attached,
    )
    return summary


class IngestionService:
    """Thin wrapper so routes can inject this like the other services."""

    def __init__(self, db: Session):
        self.db = db

    def run_cycle(self) -> IngestionRunSummary:
        return run_ingestion_cycle(self.db)
