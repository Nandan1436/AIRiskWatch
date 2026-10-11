from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import prompts
from app.config import SEARCH_CANDIDATE_K
from app.core.embedding_client import embed_text, incident_embedding_input
from app.core.llm_client import LlmClient, LlmClientError
from app.core.reranker_client import rerank
from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification
from app.schemas.search_schema import SearchResultItem

logger = logging.getLogger(__name__)

_SUMMARY_DESCRIPTION_CHAR_LIMIT = 600


class SearchError(RuntimeError):
    pass


def _truncate(text: str | None, limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


class SearchService:
    def __init__(self, db: Session, client: LlmClient):
        self.db = db
        self.client = client

    def retrieve(self, query: str, top_k: int) -> list[tuple[Incident, str | None, str | None]]:
        query_vector = embed_text(query)
        distance = Incident.embedding.cosine_distance(query_vector)
        rows = self.db.execute(
            select(Incident, MitClassification.risk_domain, MitClassification.risk_subdomain)
            .outerjoin(MitClassification, MitClassification.incident_id == Incident.incident_id)
            .where(Incident.embedding.is_not(None))
            .order_by(distance)
            .limit(top_k)
        ).all()
        return [(incident, domain, subdomain) for incident, domain, subdomain in rows]

    def rerank(
        self, query: str, candidates: list[tuple[Incident, str | None, str | None]]
    ) -> list[tuple[Incident, str | None, str | None]]:
        """Order vector candidates with a query-aware cross-encoder."""
        documents = [
            incident_embedding_input(incident.title, incident.description)
            for incident, _, _ in candidates
        ]
        try:
            relevance_scores = rerank(query, documents)
        except Exception as exc:
            raise SearchError(f"reranking failed: {exc}") from exc
        return [
            candidate
            for _, candidate in sorted(
                zip(relevance_scores, candidates, strict=True),
                key=lambda item: item[0],
                reverse=True,
            )
        ]

    def _build_summary_prompt(
        self, query: str, matches: list[tuple[Incident, str | None, str | None]]
    ) -> tuple[str, str]:
        lines = [
            f"[#{incident.incident_id}] {_truncate(incident.title, 200)}\n"
            f"  Domain: {domain or 'unclassified'}\n"
            f"  Description: {_truncate(incident.description, _SUMMARY_DESCRIPTION_CHAR_LIMIT)}"
            for incident, domain, _ in matches
        ]
        user = prompts.render(
            "search/summary_user.md", query=query, incidents="\n".join(lines)
        )
        return prompts.load_text("search/summary_system.md"), user

    def summarize(self, query: str, matches: list[tuple[Incident, str | None, str | None]]) -> str:
        if not matches:
            return "No matching incidents were found for this query."
        system, user = self._build_summary_prompt(query, matches)
        schema: dict[str, Any] = {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
        }
        try:
            raw = self.client.complete_json(system, user, schema)
        except LlmClientError as exc:
            raise SearchError(f"summary generation failed: {exc}") from exc
        summary = raw.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            raise SearchError(f"model returned an empty/invalid summary: {raw!r}")
        return summary.strip()

    def search(self, query: str, top_k: int) -> tuple[str | None, list[SearchResultItem]]:
        candidate_k = max(top_k, SEARCH_CANDIDATE_K)
        candidates = self.retrieve(query, candidate_k)
        matches = self.rerank(query, candidates)[:top_k]
        try:
            summary: str | None = self.summarize(query, matches)
        except SearchError as exc:
            # The ranked results don't depend on the LLM; return them without
            # a summary rather than failing the whole search (e.g. rate limit).
            logger.warning("search summary skipped: %s", exc)
            summary = None
        results = [
            SearchResultItem(
                incident_id=incident.incident_id,
                title=incident.title,
                incident_date=incident.incident_date,
                risk_domain=domain,
                risk_subdomain=subdomain,
            )
            for incident, domain, subdomain in matches
        ]
        return summary, results
