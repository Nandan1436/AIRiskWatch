"""News ingestion CLI — spends LLM quota (except in --check-feeds mode).

Runs the same ``run_ingestion_cycle`` the scheduler and the API endpoint use, so
behaviour is identical however it is triggered. Independent of
``INGESTION_ENABLED``, which only gates the in-process scheduler — this script
always runs when invoked, making it the way to use OS-level cron instead.

Run from backend/:
    python scripts/run_ingestion.py --check-feeds     # no LLM calls, no writes
    python scripts/run_ingestion.py --dry-run         # relevance only, no writes
    python scripts/run_ingestion.py                   # full cycle
    python scripts/run_ingestion.py --source techcrunch
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

# Make `app` importable when run as `python scripts/run_ingestion.py`.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import config  # noqa: E402
from app.core import feed_client  # noqa: E402
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


def check_feeds(sources) -> int:
    """Fetch and parse each feed, reporting entry counts. No LLM, no DB writes.

    This is the cheap way to catch a stale feed URL — outlets change them, and a
    wrong URL should be found here rather than mid-run.
    """
    failures = 0
    for source in sources:
        try:
            raw = feed_client.fetch_feed(source)
            entries = feed_client.parse_feed_entries(raw, source)
        except Exception as exc:
            failures += 1
            print(f"  FAIL  {source.name}: {exc}")
            continue

        if not entries:
            failures += 1
            print(f"  EMPTY {source.name}: parsed 0 entries from {source.feed_url}")
            continue

        newest = entries[0]
        print(f"  OK    {source.name}: {len(entries)} entries")
        print(f"          newest: {(newest.title or '(untitled)')[:90]}")
        print(f"          domain: {newest.source_domain}")

    print()
    print(f"{len(sources) - failures}/{len(sources)} feeds healthy")
    return 1 if failures else 0


def dry_run(sources) -> int:
    """Run discovery + the relevance filter only, printing verdicts.

    Spends one small LLM call per new article but writes nothing — useful for
    seeing how strict the filter actually is against a live feed before letting
    it create incidents.
    """
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
    if summary.errors:
        print(f"\nerrors ({len(summary.errors)}):")
        for message in summary.errors:
            print(f"  - {message}")

    return 0 if summary.status in ("completed", "partial", "skipped") else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check-feeds",
        action="store_true",
        help="Fetch/parse each feed and report entry counts. No LLM, no writes.",
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

    if args.check_feeds:
        print(f"Checking {len(sources)} feed(s) as {config.INGESTION_USER_AGENT}\n")
        return check_feeds(sources)
    if args.dry_run:
        return dry_run(sources)
    return full_run(sources)


if __name__ == "__main__":
    raise SystemExit(main())
