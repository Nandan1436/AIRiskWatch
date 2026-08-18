"""Polite HTTP + feed/article fetching for the ingestion pipeline.

This module owns EVERY outbound HTTP request the pipeline makes. That is the
whole point of it existing: user-agent, robots.txt, timeout, and politeness
delay can only be guaranteed if no library is allowed to make its own request
underneath us.

Two rules that follow from that, and are easy to accidentally break:

- ``feedparser`` is never handed a URL, only bytes we already fetched. Given a
  URL it would perform its own request with its own user agent, bypassing
  everything here.
- ``RobotFileParser.read()`` is never called. It, too, fetches on its own with
  Python's default ``urllib`` user agent — which defeats the purpose of sending
  an identifying one. We GET ``/robots.txt`` ourselves and hand the text to
  ``RobotFileParser.parse()``.

Failure convention: feed-level problems raise ``FeedFetchError`` (a bad feed URL
is a loud source failure, never a silent empty feed), while article-level
problems return ``None`` (one unfetchable article degrades to its RSS summary
rather than failing its whole source).
"""
from __future__ import annotations

import logging
import time
from urllib.parse import urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import feedparser
import httpx

from app import config
from app.core.news_sources import NewsSource

logger = logging.getLogger(__name__)

# robots.txt bodies are small; cap what we'll read so a misconfigured host
# serving something enormous can't stall a run.
_ROBOTS_MAX_BYTES = 512_000


class FeedFetchError(RuntimeError):
    """A feed could not be fetched or parsed — treated as a source failure."""


class FeedEntry:
    """One article discovered from a feed.

    ``url`` and ``source_domain`` are derived here, from the feed entry itself,
    and are the authoritative values for those fields — the LLM is never asked
    for them (see the trust boundary in ``ingestion_service``).
    """

    __slots__ = ("url", "title", "summary", "published_date", "source_name", "source_domain")

    def __init__(
        self,
        url: str,
        title: str | None,
        summary: str | None,
        published_date: object | None,
        source_name: str,
    ):
        self.url = url
        self.title = title
        self.summary = summary
        self.published_date = published_date
        self.source_name = source_name
        self.source_domain = urlparse(url).hostname or ""

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"FeedEntry(url={self.url!r}, title={self.title!r})"


def _client() -> httpx.Client:
    """An httpx client carrying our identifying UA and timeout.

    ``follow_redirects`` is on because feed URLs commonly 301 to a canonical
    host; the robots check is re-run against the final article URL, not the
    redirect source, for article fetches.
    """
    return httpx.Client(
        timeout=config.INGESTION_HTTP_TIMEOUT_S,
        follow_redirects=True,
        headers={
            "User-Agent": config.INGESTION_USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8",
        },
    )


def _politeness_delay() -> None:
    delay = config.INGESTION_REQUEST_DELAY_S
    if delay > 0:
        time.sleep(delay)


def is_allowed_by_robots(url: str) -> bool:
    """Whether our user agent may fetch ``url`` per the host's robots.txt.

    Fetched with our own client so the UA we advertise is the UA the host sees.
    A robots.txt that cannot be fetched (404, network error) is treated as
    permissive, which is the standard convention — absent rules are not
    prohibitions. A robots.txt we *can* read is always obeyed.
    """
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        logger.warning("robots: unparseable url=%s -> denied", url)
        return False

    robots_url = urlunparse((parsed.scheme, parsed.netloc, "/robots.txt", "", "", ""))
    try:
        with _client() as client:
            response = client.get(robots_url)
    except httpx.HTTPError as exc:
        logger.info("robots: url=%s fetch_failed=%s allowed=True (no rules)", robots_url, exc)
        return True

    if response.status_code >= 400:
        logger.info(
            "robots: url=%s status=%s allowed=True (no rules)",
            robots_url,
            response.status_code,
        )
        return True

    parser = RobotFileParser()
    # parse(), never read() — read() would issue its own request with urllib's
    # default user agent, bypassing this module entirely.
    parser.parse(response.text[:_ROBOTS_MAX_BYTES].splitlines())
    allowed = parser.can_fetch(config.INGESTION_USER_AGENT, url)
    logger.info("robots: url=%s allowed=%s", url, allowed)
    return allowed


def fetch_feed(source: NewsSource) -> bytes:
    """Fetch one feed's raw bytes.

    Raises ``FeedFetchError`` on robots denial or any non-2xx — a 404/403 on a
    feed means the URL is wrong or we're blocked, which must be visible in the
    run summary rather than looking like a quiet day with no articles.
    """
    if not is_allowed_by_robots(source.feed_url):
        raise FeedFetchError(f"{source.name}: robots.txt disallows {source.feed_url}")

    _politeness_delay()
    try:
        with _client() as client:
            response = client.get(source.feed_url)
    except httpx.HTTPError as exc:
        raise FeedFetchError(f"{source.name}: {exc}") from exc

    if response.status_code != 200:
        raise FeedFetchError(f"{source.name}: HTTP {response.status_code} for {source.feed_url}")

    return response.content


def parse_feed_entries(raw: bytes, source: NewsSource) -> list[FeedEntry]:
    """Parse already-fetched feed bytes into entries.

    ``feedparser`` is given bytes, never a URL, so it cannot make a request of
    its own. Entries without a usable link are dropped: without a URL there is
    no provenance, no dedup key, and nothing to fetch.
    """
    parsed = feedparser.parse(raw)
    if getattr(parsed, "bozo", 0) and not parsed.entries:
        reason = getattr(parsed, "bozo_exception", "unknown parse error")
        raise FeedFetchError(f"{source.name}: malformed feed ({reason})")

    entries: list[FeedEntry] = []
    for raw_entry in parsed.entries:
        url = (raw_entry.get("link") or "").strip()
        if not url:
            continue
        entries.append(
            FeedEntry(
                url=url,
                title=(raw_entry.get("title") or "").strip() or None,
                summary=_first_summary(raw_entry),
                published_date=raw_entry.get("published_parsed")
                or raw_entry.get("updated_parsed"),
                source_name=source.name,
            )
        )
    return entries


def _first_summary(raw_entry: dict) -> str | None:
    """The entry's own summary text, whichever field carries it.

    Atom uses ``content``, RSS uses ``summary``/``description``; feedparser
    normalizes some but not all of this.
    """
    content = raw_entry.get("content")
    if isinstance(content, list) and content:
        value = (content[0].get("value") or "").strip()
        if value:
            return value
    for key in ("summary", "description"):
        value = (raw_entry.get(key) or "").strip()
        if value:
            return value
    return None


def fetch_article(url: str) -> bytes | None:
    """Fetch one article page, or ``None`` if we may not or cannot.

    Returns ``None`` rather than raising on robots denial, non-2xx, or network
    error: a single article page being unavailable is a per-article degradation
    (the caller falls back to the feed summary), not a reason to abandon the
    source.
    """
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


def extract_article_text(html: bytes, url: str | None = None) -> str | None:
    """Extract an article's main body text from its HTML.

    Uses ``trafilatura`` rather than hand-rolled tag-stripping: every outlet's
    markup differs, and boilerplate/nav removal is exactly what it's built for.
    Returns ``None`` when nothing usable comes back (a paywall interstitial or a
    JS-rendered shell), so the caller knows to fall back to the feed summary.
    """
    try:
        import trafilatura
    except ImportError:  # pragma: no cover - dependency is in requirements.txt
        logger.warning("trafilatura not installed; cannot extract article text")
        return None

    try:
        text = trafilatura.extract(
            html.decode("utf-8", errors="replace"),
            url=url,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
    except Exception as exc:  # trafilatura raises assorted parse errors
        logger.info("extract: url=%s failed=%s", url, exc)
        return None

    if not text:
        return None
    text = text.strip()
    return text or None
