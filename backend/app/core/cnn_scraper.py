from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.core.scraper_common import ScrapedArticle, parse_standard_article

# Pure HTML-to-data functions. All fetching goes through app/core/news_client.py.

_ARTICLE_HREF = re.compile(
    r"^(?:https://(?:www|edition)\.cnn\.com)?(/(\d{4})/(\d{2})/(\d{2})(?:/[a-z0-9-]+)+)/?$"
)
# Video, gallery and live-blog pages have no article body to extract.
_NON_ARTICLE_SEGMENTS = {"video", "videos", "gallery", "live-news"}
_BODY_SELECTOR = "div.article__content p.paragraph-elevate"


def parse_listing(html: bytes) -> list[str]:
    """Article URLs, newest date first. URLs carry only the calendar date, so
    order within a day is the page's and callers must check each article's
    date. URLs are normalised to www.cnn.com, the pages' canonical host."""
    soup = BeautifulSoup(html, "html.parser")
    by_url: dict[str, str] = {}
    for anchor in soup.select("a[href]"):
        match = _ARTICLE_HREF.match(anchor["href"].split("?")[0].split("#")[0])
        if not match:
            continue
        path = match.group(1)
        if _NON_ARTICLE_SEGMENTS.intersection(path.split("/")):
            continue
        by_url.setdefault(f"https://www.cnn.com{path}", "".join(match.group(2, 3, 4)))
    # sorted() is stable, so same-day articles keep their page order.
    return sorted(by_url, key=by_url.__getitem__, reverse=True)


def parse_article(html: bytes) -> ScrapedArticle | None:
    return parse_standard_article(html, _BODY_SELECTOR)
