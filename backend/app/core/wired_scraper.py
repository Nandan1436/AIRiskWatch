from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.core.scraper_common import ScrapedArticle, parse_standard_article

# Pure HTML-to-data functions. All fetching goes through app/core/news_client.py.

_STORY_HREF = re.compile(r"^(?:https://(?:www\.)?wired\.com)?(/story/[a-z0-9-]+)/?$")
_BODY_SELECTOR = "div.body__inner-container > p"


def parse_listing(html: bytes) -> list[str]:
    """Story URLs in page order. Wired listings carry no dates and are not
    strictly newest-first, so callers must check each article's date."""
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    for anchor in soup.select("a[href]"):
        match = _STORY_HREF.match(anchor["href"].split("?")[0].split("#")[0])
        if not match:
            continue
        url = f"https://www.wired.com{match.group(1)}/"
        if url not in urls:
            urls.append(url)
    return urls


def parse_article(html: bytes) -> ScrapedArticle | None:
    return parse_standard_article(html, _BODY_SELECTOR)
