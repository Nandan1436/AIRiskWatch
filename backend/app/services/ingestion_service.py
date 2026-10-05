from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import func, insert, select, text as sql_text
from sqlalchemy.orm import Session

from app import config
from app.core import news_client
from app.core.embedding_client import embed_text, incident_embedding_input
from app.core.llm_client import LlmClient, LlmClientError, create_llm_client
from app.core.news_sources import NEWS_SOURCES, NewsSource
from app.models.incident_model import Incident, incident_report_table
from app.models.report_model import Report
from app.services.llm_classification_service import LlmClassificationService

logger = logging.getLogger(__name__)

_ADVISORY_LOCK_KEY = 8_401_207

_PROMPT_TEXT_CHAR_LIMIT = 6000
_RELEVANCE_EXCERPT_CHAR_LIMIT = 2000

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\f\v]+")


class IngestionError(RuntimeError):
    pass


@dataclass
class IngestionRunSummary:
    status: str = "running"
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


class RelevanceVerdict(BaseModel):
    is_incident: bool
    harm_type: str = ""
    ai_system: str = ""
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = ""

    def accepted(self, min_confidence: float) -> bool:
        if not self.is_incident:
            return False
        if self.confidence < min_confidence:
            return False
        return bool(self.harm_type.strip()) and bool(self.ai_system.strip())


class ReportFields(BaseModel):
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
    "from the headline or text that establish the harm.\n\n"
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


def strip_html(value: str | None) -> str:
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


def _entry_published_date(entry: news_client.NewsArticle) -> date | None:
    return entry.published_date.date() if entry.published_date else None


def next_id(db: Session, column) -> int:
    # MAX + 1 is only safe under the advisory lock: run_ingestion_cycle holds it
    # for a whole run, manual inserts take it via try_lock_id_allocation.
    current = db.scalar(select(func.coalesce(func.max(column), 0)))
    return int(current or 0) + 1


def try_lock_id_allocation(db: Session) -> bool:
    """Take the ingestion lock until db's current transaction ends.

    Lets admin inserts allocate ids with next_id; returns False while an
    ingestion run holds the lock.
    """
    return bool(
        db.scalar(
            sql_text("SELECT pg_try_advisory_xact_lock(:key)"),
            {"key": _ADVISORY_LOCK_KEY},
        )
    )


def discover_articles(
    db: Session,
    source: NewsSource,
    seen_urls: set[str] | None = None,
) -> list[news_client.NewsArticle]:
    listing = news_client.fetch_listing(source)
    urls = news_client.parse_listing(listing, source)
    if not urls:
        raise news_client.SourceFetchError(
            f"{source.name}: no article links found on {source.listing_url}"
        )

    if seen_urls is None:
        seen_urls = set()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=config.INGESTION_LOOKBACK_HOURS)

    fresh: list[news_client.NewsArticle] = []
    fetched = stale = 0
    for url in urls:
        if fetched >= config.INGESTION_MAX_ARTICLES_PER_SOURCE:
            break
        # Check the database before fetching: known URLs cost no request or LLM call.
        if url in seen_urls or _report_url_exists(db, url):
            continue
        seen_urls.add(url)

        fetched += 1
        html = news_client.fetch_article(url)
        if html is None:
            continue
        entry = news_client.parse_article(html, url, source)
        if entry is None:
            continue
        if entry.published_date is None:
            # Provenance comes from the page, never the LLM: no date, no ingest.
            logger.info("discover: url=%s skipped=no_published_date", url)
            continue
        if entry.published_date < cutoff:
            stale += 1
            if source.newest_first:
                break
            continue
        fresh.append(entry)

    logger.info(
        "discover: source=%s links=%d fetched=%d stale=%d new=%d",
        source.name,
        len(urls),
        fetched,
        stale,
        len(fresh),
    )
    return fresh


def _report_url_exists(db: Session, url: str) -> bool:
    # report.url can't be UNIQUE (the seed corpus has duplicates); this is the idempotency check.
    return (
        db.scalar(select(Report.id).where(Report.url == url).limit(1)) is not None
    )


def filter_relevance(client: LlmClient, entry: news_client.NewsArticle) -> RelevanceVerdict:
    excerpt = _truncate(entry.body or strip_html(entry.summary), _RELEVANCE_EXCERPT_CHAR_LIMIT)
    user = (
        f"Source: {entry.source_name}\n"
        f"Headline: {entry.title or '(none)'}\n"
        f"Standfirst: {entry.summary or '(none)'}\n"
        f"Article text (opening):\n{excerpt or '(none)'}\n\n"
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


def extract_report_fields(
    client: LlmClient, entry: news_client.NewsArticle, body_text: str
) -> ReportFields:
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

    if not fields.title.strip():
        fields.title = entry.title or entry.url
    return fields


def resolve_incident(
    db: Session, title: str, description: str
) -> tuple[int | None, float, list[float] | None]:
    query_text = incident_embedding_input(title, description)
    if not query_text.strip():
        return None, 0.0, None

    query_vector = embed_text(query_text)
    distance = Incident.embedding.cosine_distance(query_vector)
    row = db.execute(
        select(Incident.incident_id, distance.label("distance"))
        .where(Incident.embedding.is_not(None))
        .order_by(distance)
        .limit(1)
    ).first()
    if row is None:
        return None, 0.0, query_vector

    incident_id, dist = row
    similarity = 1.0 - float(dist)
    if similarity >= config.INGESTION_SIMILARITY_THRESHOLD:
        return int(incident_id), similarity, query_vector
    return None, similarity, query_vector


def _insert_report(
    db: Session,
    entry: news_client.NewsArticle,
    fields: ReportFields,
    body_text: str,
) -> int:
    report_number = next_id(db, Report.report_number)
    db.add(
        Report(
            report_number=report_number,
            title=fields.title or entry.title,
            text=body_text,
            # Provenance comes from the feed entry, never from the LLM.
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
    entry: news_client.NewsArticle,
    fields: ReportFields,
    body_text: str,
    incident_id: int,
) -> None:
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
    client: LlmClient, entry: news_client.NewsArticle, body_text: str
) -> IncidentFields:
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
    entry: news_client.NewsArticle,
    fields: ReportFields,
    body_text: str,
    incident_fields: IncidentFields,
    embedding: list[float] | None,
    summary: IngestionRunSummary,
) -> int:
    incident_id = next_id(db, Incident.incident_id)
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
            embedding=embedding,
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

    # Classified after the commit, so a classification failure never loses the incident.
    try:
        service = LlmClassificationService(db, client)
        result = service.classify_incident(incident_id)
        service.save_llm_classification(incident_id, result)
    except KeyboardInterrupt:
        raise
    except Exception as exc:
        db.rollback()
        summary.record_error(
            f"incident {incident_id} created but not classified: "
            f"{type(exc).__name__}: {exc}"
        )

    return incident_id


def process_article(
    db: Session,
    client: LlmClient,
    entry: news_client.NewsArticle,
    summary: IngestionRunSummary,
) -> None:
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

    # Discovery already fetched and parsed the page; the body is in hand.
    body_text = entry.body or ""
    if not body_text.strip():
        raise IngestionError(f"no usable text for {entry.url}")

    fields = extract_report_fields(client, entry, body_text)

    if _report_url_exists(db, entry.url):
        logger.info("skip: url=%s inserted_concurrently", entry.url)
        return

    incident_fields = extract_incident_fields(client, entry, body_text)

    incident_id, similarity, embedding = resolve_incident(
        db, incident_fields.title, incident_fields.description
    )
    if incident_id is not None:
        attach_to_incident(db, entry, fields, body_text, incident_id)
        summary.reports_attached += 1
        logger.info(
            "resolve: url=%s matched incident_id=%d similarity=%.4f",
            entry.url,
            incident_id,
            similarity,
        )
        return

    create_incident(
        db, client, entry, fields, body_text, incident_fields, embedding, summary
    )
    summary.incidents_created += 1
    logger.info(
        "resolve: url=%s no match (best similarity=%.4f) -> new incident",
        entry.url,
        similarity,
    )


def _try_advisory_lock(connection) -> bool:
    acquired = bool(
        connection.execute(
            sql_text("SELECT pg_try_advisory_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
    )
    # End the autobegun transaction: a Session bound to a connection that is already
    # in a transaction joins it and never commits it, so every write would roll back.
    connection.commit()
    return acquired


def _release_advisory_lock(connection) -> None:
    try:
        released = connection.execute(
            sql_text("SELECT pg_advisory_unlock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
        connection.commit()
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
    summary = IngestionRunSummary()
    engine = db.get_bind()

    # Advisory locks belong to one backend connection, so the lock, all work, and the
    # release share this connection rather than the caller's session.
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
    started = datetime.now(timezone.utc)
    owns_client = client is None
    try:
        if client is None:
            try:
                client = create_llm_client()
            except LlmClientError as exc:
                summary.status = "failed"
                summary.record_error(f"LLM client unavailable: {exc}")
                sources = ()

        seen_urls: set[str] = set()

        for source in sources:
            try:
                entries = discover_articles(db, source, seen_urls)
            except KeyboardInterrupt:
                raise
            except Exception as exc:
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
        summary.status = "failed"
        summary.record_error(f"cycle aborted: {type(exc).__name__}: {exc}")
        logger.exception("ingestion cycle aborted")
    finally:
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
    def __init__(self, db: Session):
        self.db = db

    def run_cycle(self) -> IngestionRunSummary:
        return run_ingestion_cycle(self.db)
