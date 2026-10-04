from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select  # noqa: E402

from app.core.embedding_client import embed_texts, incident_embedding_input  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.incident_model import Incident  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 3 embedding backfill")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--limit", type=int, default=None, help="cap number of incidents")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = select(Incident).where(Incident.embedding.is_(None))
        if args.limit:
            query = query.limit(args.limit)
        incidents = list(db.scalars(query).all())

        if not incidents:
            print("Nothing to do — all incidents already embedded.")
            return

        print(f"Embedding {len(incidents)} incident(s) in batches of {args.batch_size}...")
        done = 0
        for start in range(0, len(incidents), args.batch_size):
            batch = incidents[start : start + args.batch_size]
            texts = [incident_embedding_input(inc.title, inc.description) for inc in batch]
            vectors = embed_texts(texts)
            for inc, vector in zip(batch, vectors):
                inc.embedding = vector
            db.commit()
            done += len(batch)
            print(f"  {done}/{len(incidents)}")

        print(f"Done. Embedded {done} incident(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
