from __future__ import annotations

import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup

from app.core.scraper_common import ScrapedArticle, parse_standard_article

# Pure HTML-to-data functions. All fetching goes through app/core/news_client.py.

_ARTICLE_HREF = re.compile(
    r"^(?:https://(?:www\.)?thedailystar\.net)?(/news/technology/news/[a-z0-9-]+-(\d{6,}))/?$"
)
_BODY_SELECTOR = "div.block-field-blocknodenewsbody p"
# The page has no published_time meta; its analytics call embeds the node's
# creation time as a Unix timestamp: "created":"1791111434".
_CREATED_EPOCH = re.compile(r'"created":"(\d{9,11})"')


def parse_listing(html: bytes) -> list[str]:
    """Article URLs, newest first. Node IDs increase with publication, so
    sorting by ID gives a reliable order even when the page features older
    stories at the top."""
    soup = BeautifulSoup(html, "html.parser")
    by_id: dict[int, str] = {}
    for anchor in soup.select("a[href]"):
        match = _ARTICLE_HREF.match(anchor["href"].split("?")[0].split("#")[0])
        if match:
            by_id[int(match.group(2))] = f"https://www.thedailystar.net{match.group(1)}"
    return [by_id[node_id] for node_id in sorted(by_id, reverse=True)]


def parse_article(html: bytes) -> ScrapedArticle | None:
    return parse_standard_article(html, _BODY_SELECTOR, fallback_published=_created_at)


def _created_at(html: bytes) -> datetime | None:
    match = _CREATED_EPOCH.search(html.decode("utf-8", errors="replace"))
    if match is None:
        return None
    return datetime.fromtimestamp(int(match.group(1)), tz=timezone.utc)
