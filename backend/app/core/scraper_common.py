from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Protocol

from bs4 import BeautifulSoup


@dataclass(frozen=True)
class ScrapedArticle:
    title: str
    summary: str | None
    body: str
    published_at: datetime | None


class SiteScraper(Protocol):
    """What news_client needs from a site module. Implementations are pure
    HTML-to-data functions; all fetching stays in news_client."""

    def parse_listing(self, html: bytes) -> list[str]: ...

    def parse_article(self, html: bytes) -> ScrapedArticle | None: ...


def parse_standard_article(
    html: bytes,
    body_selector: str,
    fallback_published: Callable[[bytes], datetime | None] | None = None,
) -> ScrapedArticle | None:
    soup = BeautifulSoup(html, "html.parser")
    headline = soup.select_one("h1")
    title = headline.get_text(" ", strip=True) if headline else meta_content(soup, "og:title")
    body = paragraphs_text(soup, body_selector)
    if not title or not body:
        return None

    published_at = parse_iso_datetime(meta_content(soup, "article:published_time"))
    if published_at is None:
        published_at = jsonld_date_published(soup)
    if published_at is None and fallback_published is not None:
        published_at = fallback_published(html)

    return ScrapedArticle(
        title=title,
        summary=meta_content(soup, "og:description", "description"),
        body=body,
        published_at=published_at,
    )


def meta_content(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find(
            "meta", attrs={"name": name}
        )
        value = (tag.get("content") or "").strip() if tag else ""
        if value:
            return value
    return None


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def jsonld_date_published(soup: BeautifulSoup) -> datetime | None:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
        except (TypeError, ValueError):
            continue
        for node in _jsonld_nodes(data):
            published = parse_iso_datetime(node.get("datePublished"))
            if published is not None:
                return published
    return None


def _jsonld_nodes(data: object) -> list[dict]:
    if isinstance(data, list):
        return [node for item in data for node in _jsonld_nodes(item)]
    if isinstance(data, dict):
        return [data, *_jsonld_nodes(data.get("@graph", []))]
    return []


def paragraphs_text(soup: BeautifulSoup, selector: str) -> str | None:
    paragraphs = [p.get_text(" ", strip=True) for p in soup.select(selector)]
    body = "\n\n".join(p for p in paragraphs if p)
    return body or None
