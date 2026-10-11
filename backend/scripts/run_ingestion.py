from __future__ import annotations

import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import config  # noqa: E402
from app.core import news_client  # noqa: E402
from app.core.llm_client import create_llm_client  # noqa: E402
from app.core.news_sources import NEWS_SOURCES  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.services.ingestion_service import (  # noqa: E402
    discover_articles,
    filter_relevance,
    run_ingestion_cycle,
)


def select_sources(pattern: str | None):
    if not pattern:
        return NEWS_SOURCES
    needle = pattern.lower()
    matched = tuple(
        s for s in NEWS_SOURCES if needle in s.name.lower() or needle in s.domain.lower()
    )
    if not matched:
        names = ", ".join(s.name for s in NEWS_SOURCES)
        raise SystemExit(f"No source matches {pattern!r}. Available: {names}")
    return matched


def check_sources(sources) -> int:
    failures = 0
    for source in sources:
        try:
            listing = news_client.fetch_listing(source)
            urls = news_client.parse_listing(listing, source)
        except Exception as exc:
            failures += 1
            print(f"  FAIL  {source.name}: {exc}")
            continue

        if not urls:
            failures += 1
            print(f"  EMPTY {source.name}: 0 article links on {source.listing_url}")
            continue

        # Parse the first article too, so a changed article layout shows up here.
        html = news_client.fetch_article(urls[0])
        entry = news_client.parse_article(html, urls[0], source) if html else None
        if entry is None:
            failures += 1
            print(f"  FAIL  {source.name}: could not parse {urls[0]}")
            continue

        published = entry.published_date.isoformat() if entry.published_date else "MISSING"
        print(f"  OK    {source.name}: {len(urls)} article links")
        print(f"          first: {(entry.title or '(untitled)')[:90]}")
        print(f"          published: {published}  body: {len(entry.body or '')} chars")

    print()
    print(f"{len(sources) - failures}/{len(sources)} sources healthy")
    return 1 if failures else 0


def dry_run(sources) -> int:
    db = SessionLocal()
    client = create_llm_client()
    accepted = rejected = failed = 0
    try:
        for source in sources:
            print(f"\n{source.name}")
            try:
                entries = discover_articles(db, source)
            except Exception as exc:
                print(f"  FAIL {exc}")
                continue
            if not entries:
                print("  (no new articles)")
                continue
            for entry in entries:
                try:
                    verdict = filter_relevance(client, entry)
                except Exception as exc:
                    failed += 1
                    print(f"  ERR  {entry.url}: {exc}")
                    continue
                ok = verdict.accepted(config.INGESTION_RELEVANCE_MIN_CONFIDENCE)
                if ok:
                    accepted += 1
                else:
                    rejected += 1
                print(
                    f"  {'YES' if ok else 'no ':3}  "
                    f"[{verdict.confidence:.2f}] {(entry.title or entry.url)[:80]}"
                )
                if ok:
                    print(f"         harm={verdict.harm_type!r} system={verdict.ai_system!r}")
                else:
                    print(f"         {verdict.reason[:100]}")
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
        db.close()

    print(f"\naccepted={accepted} rejected={rejected} errors={failed}")
    return 0


def full_run(sources) -> int:
    db = SessionLocal()
    try:
        summary = run_ingestion_cycle(db, sources=sources)
    finally:
        db.close()

    print()
    print(f"status              {summary.status}")
    print(f"sources_processed   {summary.sources_processed}")
    print(f"articles_seen       {summary.articles_seen}")
    print(f"articles_relevant   {summary.articles_relevant}")
    print(f"articles_failed     {summary.articles_failed}")
    print(f"incidents_created   {summary.incidents_created}")
    print(f"reports_attached    {summary.reports_attached}")
    if summary.created_incidents:
        print(f"\ncreated incidents ({len(summary.created_incidents)}):")
        for created in summary.created_incidents:
            print(f"  - #{created.incident_id} {created.title}  <{created.url}>")
    if summary.errors:
        print(f"\nerrors ({len(summary.errors)}):")
        for message in summary.errors:
            print(f"  - {message}")

    return 0 if summary.status in ("completed", "partial", "skipped") else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the news ingestion pipeline.")
    parser.add_argument(
        "--check-sources",
        action="store_true",
        help="Fetch each listing page and parse one article. No LLM, no writes.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Discovery + relevance filter only; prints verdicts, writes nothing.",
    )
    parser.add_argument(
        "--source",
        help="Only process sources whose name/domain contains this substring.",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show pipeline debug logging."
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )

    sources = select_sources(args.source)

    if args.check_sources:
        print(f"Checking {len(sources)} source(s) as {config.INGESTION_USER_AGENT}\n")
        return check_sources(sources)
    if args.dry_run:
        return dry_run(sources)
    return full_run(sources)


if __name__ == "__main__":
    raise SystemExit(main())
