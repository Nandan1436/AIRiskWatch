"""Local cross-encoder reranker for the second stage of semantic search."""
from __future__ import annotations

from sentence_transformers import CrossEncoder

from app.config import SEARCH_RERANKER_MODEL

_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    global _model
    if _model is None:
        _model = CrossEncoder(SEARCH_RERANKER_MODEL)
    return _model


def rerank(query: str, documents: list[str]) -> list[float]:
    """Score each query/document pair for ordering, not as a probability."""
    if not documents:
        return []
    scores = _get_model().predict([(query, document) for document in documents])
    return [float(score) for score in scores]
