from __future__ import annotations

import logging
import time
from datetime import datetime
from urllib.parse import urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import httpx

from app import config
from app.core import cnn_scraper, dailystar_scraper, wired_scraper
from app.core.news_sources import NewsSource
from app.core.scraper_common import SiteScraper

logger = logging.getLogger(__name__)

_ROBOTS_MAX_BYTES = 512_000
# Every candidate article is fetched now, so cache robots.txt per host instead
# of re-downloading it before each request.
_ROBOTS_TTL_S = 3600.0
_robots_cache: dict[str, tuple[float, RobotFileParser | None]] = {}

_SCRAPERS: dict[str, SiteScraper] = {
    "wired.com": wired_scraper,
    "thedailystar.net": dailystar_scraper,
    "cnn.com": cnn_scraper,
}


class SourceFetchError(RuntimeError):
    pass


class NewsArticle:
    __slots__ = (
        "url",
        "title",
        "summary",
        "body",
        "published_date",
        "source_name",
        "source_domain",
    )

    def __init__(
        self,
        url: str,
        title: str | None,
        summary: str | None,
        body: str | None,
        published_date: datetime | None,
        source_name: str,
    ):
        self.url = url
        self.title = title
        self.summary = summary
        self.body = body
        self.published_date = published_date
        self.source_name = source_name
        self.source_domain = urlparse(url).hostname or ""

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"NewsArticle(url={self.url!r}, title={self.title!r})"


def _client() -> httpx.Client:
    return httpx.Client(
        timeout=config.INGESTION_HTTP_TIMEOUT_S,
        follow_redirects=True,
        headers={
            "User-Agent": config.INGESTION_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
    )


def _politeness_delay() -> None:
    delay = config.INGESTION_REQUEST_DELAY_S
    if delay > 0:
        time.sleep(delay)


def _robots_parser(robots_url: str) -> RobotFileParser | None:
    cached = _robots_cache.get(robots_url)
    if cached is not None and time.monotonic() - cached[0] < _ROBOTS_TTL_S:
        return cached[1]

    parser: RobotFileParser | None = None
    try:
        with _client() as client:
            response = client.get(robots_url)
    except httpx.HTTPError as exc:
        logger.info("robots: url=%s fetch_failed=%s allowed=True (no rules)", robots_url, exc)
    else:
        if response.status_code >= 400:
            logger.info(
                "robots: url=%s status=%s allowed=True (no rules)",
                robots_url,
                response.status_code,
            )
        else:
            parser = RobotFileParser()
            # Never RobotFileParser.read(): it fetches with urllib's default user agent.
            parser.parse(response.text[:_ROBOTS_MAX_BYTES].splitlines())

    _robots_cache[robots_url] = (time.monotonic(), parser)
    return parser


def is_allowed_by_robots(url: str) -> bool:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        logger.warning("robots: unparseable url=%s -> denied", url)
        return False

    robots_url = urlunparse((parsed.scheme, parsed.netloc, "/robots.txt", "", "", ""))
    parser = _robots_parser(robots_url)
    if parser is None:
        return True
    allowed = parser.can_fetch(config.INGESTION_USER_AGENT, url)
    logger.debug("robots: url=%s allowed=%s", url, allowed)
    return allowed


def _scraper_for(domain: str) -> SiteScraper:
    scraper = _SCRAPERS.get(domain.lower().removeprefix("www."))
    if scraper is None:
        raise SourceFetchError(f"no scraper registered for {domain}")
    return scraper


def fetch_listing(source: NewsSource) -> bytes:
    if not is_allowed_by_robots(source.listing_url):
        raise SourceFetchError(f"{source.name}: robots.txt disallows {source.listing_url}")

    _politeness_delay()
    try:
        with _client() as client:
            response = client.get(source.listing_url)
    except httpx.HTTPError as exc:
        raise SourceFetchError(f"{source.name}: {exc}") from exc

    if response.status_code != 200:
        raise SourceFetchError(
            f"{source.name}: HTTP {response.status_code} for {source.listing_url}"
        )

    return response.content


def parse_listing(html: bytes, source: NewsSource) -> list[str]:
    return _scraper_for(source.domain).parse_listing(html)


def fetch_article(url: str) -> bytes | None:
    if not is_allowed_by_robots(url):
        logger.info("article: url=%s skipped=robots_disallow", url)
        return None

    _politeness_delay()
    try:
        with _client() as client:
            response = client.get(url)
    except httpx.HTTPError as exc:
        logger.info("article: url=%s fetch_failed=%s", url, exc)
        return None

    if response.status_code != 200:
        logger.info("article: url=%s status=%s", url, response.status_code)
        return None

    return response.content


def parse_article(html: bytes, url: str, source: NewsSource) -> NewsArticle | None:
    try:
        scraped = _scraper_for(source.domain).parse_article(html)
    except Exception as exc:
        logger.info("extract: url=%s source_parser_failed=%s", url, exc)
        scraped = None

    if scraped is None:
        logger.info("extract: url=%s no title/body found", url)
        return None

    return NewsArticle(
        url=url,
        title=scraped.title,
        summary=scraped.summary,
        body=scraped.body,
        published_date=scraped.published_at,
        source_name=source.name,
    )
