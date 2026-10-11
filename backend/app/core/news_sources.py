from __future__ import annotations

from typing import NamedTuple


class NewsSource(NamedTuple):
    name: str
    listing_url: str
    domain: str
    # True when parse_listing returns newest-first, so discovery can stop at
    # the first article older than the lookback window.
    newest_first: bool


NEWS_SOURCES: tuple[NewsSource, ...] = (
    NewsSource(
        name="Wired AI",
        listing_url="https://www.wired.com/tag/artificial-intelligence/",
        domain="wired.com",
        newest_first=False,
    ),
    NewsSource(
        name="Wired Security",
        listing_url="https://www.wired.com/category/security/",
        domain="wired.com",
        newest_first=False,
    ),
    NewsSource(
        name="Daily Star AI",
        listing_url="https://www.thedailystar.net/news/technology/artificial-intelligence",
        domain="thedailystar.net",
        newest_first=True,
    ),
    NewsSource(
        name="CNN AI",
        listing_url="https://edition.cnn.com/business/tech/ai-news-artificial-intelligence-updates",
        domain="cnn.com",
        # URLs carry only the date, so same-day order isn't guaranteed.
        newest_first=False,
    ),
)
