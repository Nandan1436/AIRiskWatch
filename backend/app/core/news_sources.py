"""Curated RSS/Atom sources for the ingestion pipeline (Phase 4+7 merged).

Plain Python data, deliberately NOT a database table: this is a small, static,
curated list with no admin UI to edit it through, so a table would be config
wearing a database costume. Editing this file is the intended way to change the
source set.

Only outlets that publish an official public RSS/Atom feed are listed — feeds
exist to be polled, which avoids the terms-of-service ambiguity that scraping a
rendered index page would carry. Every entry is still gated per-article by the
relevance filter (see ``ingestion_service.filter_relevance``); being on this
list means "worth checking", never "assumed to be an AI incident".

A wrong or stale feed URL surfaces as a loud per-source failure in the run
summary's ``errors`` list, never as a silent "0 entries" — see
``feed_client.fetch_feed``, which raises on non-2xx.
"""
from __future__ import annotations

from typing import NamedTuple


class NewsSource(NamedTuple):
    """One pollable feed.

    ``domain`` is recorded for reference/debugging only. The value actually
    stored on a report comes from the article URL itself
    (``urlparse(url).hostname``), so a mismatch here can never mislabel
    provenance — see the trust boundary in ``extract_report_fields``.
    """

    name: str
    feed_url: str
    domain: str


NEWS_SOURCES: tuple[NewsSource, ...] = (
    NewsSource(
        name="TechCrunch AI",
        feed_url="https://techcrunch.com/category/artificial-intelligence/feed/",
        domain="techcrunch.com",
    ),
    NewsSource(
        name="Ars Technica AI",
        feed_url="https://feeds.arstechnica.com/arstechnica/technology-lab",
        domain="arstechnica.com",
    ),
    NewsSource(
        name="VentureBeat AI",
        feed_url="https://venturebeat.com/category/ai/feed/",
        domain="venturebeat.com",
    ),
    NewsSource(
        name="The Verge AI",
        feed_url="https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
        domain="theverge.com",
    ),
    NewsSource(
        name="MIT Technology Review AI",
        feed_url="https://www.technologyreview.com/topic/artificial-intelligence/feed",
        domain="technologyreview.com",
    ),
)
