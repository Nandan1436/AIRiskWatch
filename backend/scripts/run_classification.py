from __future__ import annotations

import argparse
import json
import os
import random
import sys
from collections import defaultdict

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select  # noqa: E402

from app.core import mit_taxonomy as tax  # noqa: E402
from app.core.llm_client import LlmClientError, create_llm_client  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.incident_model import Incident  # noqa: E402
from app.models.mit_classification_model import MitClassification  # noqa: E402
from app.services.llm_classification_service import (  # noqa: E402
    ClassificationError,
    LlmClassificationService,
)

RESULTS_ROOT = os.path.join(os.path.dirname(__file__), "..", "eval_results")


def gold_incident_domains(db) -> dict[int, str]:
    rows = db.execute(
        select(MitClassification.incident_id, MitClassification.risk_domain).where(
            MitClassification.classified_by == "human"
        )
    ).all()
    mapping: dict[int, str] = {}
    for incident_id, domain in rows:
        if incident_id not in mapping and domain is not None:
            mapping[incident_id] = domain
    return mapping


def unclassified_incident_ids(db) -> list[int]:
    classified = select(MitClassification.incident_id).distinct()
    rows = db.scalars(
        select(Incident.incident_id).where(Incident.incident_id.not_in(classified))
    ).all()
    return sorted(rows)


def stratified_sample(
    id_to_domain: dict[int, str], n: int, seed: int, floor: int = 10
) -> list[int]:
    rnd = random.Random(seed)
    by_domain: dict[str, list[int]] = defaultdict(list)
    for incident_id, domain in id_to_domain.items():
        by_domain[domain].append(incident_id)
    total = len(id_to_domain)
    chosen: list[int] = []
    for ids in by_domain.values():
        rnd.shuffle(ids)
        k = max(floor, round(n * len(ids) / total)) if total else 0
        chosen.extend(ids[: min(k, len(ids))])
    rnd.shuffle(chosen)
    return chosen


def random_sample(ids: list[int], n: int, seed: int) -> list[int]:
    rnd = random.Random(seed)
    pool = list(ids)
    rnd.shuffle(pool)
    return pool[:n]


def already_done_ids(predictions_path: str) -> set[int]:
    done: set[int] = set()
    if not os.path.exists(predictions_path):
        return done
    with open(predictions_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                if record.get("ok"):
                    done.add(int(record["incident_id"]))
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
    return done


def check_taxonomy(db) -> None:
    rows = db.execute(
        select(MitClassification.risk_domain, MitClassification.risk_subdomain).where(
            MitClassification.classified_by == "human"
        )
    ).all()
    gold_domains = {d for d, _ in rows if d}
    gold_pairs = {(d, s) for d, s in rows if d and s}
    result = tax.check_missing_against_db(gold_domains, gold_pairs)
    if result["missing_domains"] or result["missing_pairs"]:
        print("TAXONOMY MISMATCH — fix app/core/mit_taxonomy.py before running:")
        for d in result["missing_domains"]:
            print(f"  missing domain: {d!r}")
        for pair in result["missing_pairs"]:
            print(f"  missing pair:   {pair!r}")
        sys.exit(1)
    print(
        f"Taxonomy check OK: {len(gold_domains)} domains / "
        f"{len(gold_pairs)} subdomain pairs matched."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 2 LLM classifier batch runner")
    parser.add_argument("--mode", choices=["eval", "backfill"], required=True)
    parser.add_argument("--limit", type=int, default=None, help="cap number of incidents")
    parser.add_argument("--sample", type=int, default=None, help="stratified/random sample size")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--run-name", default=None, help="output subdir under eval_results/")
    parser.add_argument("--skip-check", action="store_true", help="skip the taxonomy-vs-DB check")
    args = parser.parse_args()

    run_name = args.run_name or args.mode
    out_dir = os.path.join(RESULTS_ROOT, run_name)
    os.makedirs(out_dir, exist_ok=True)
    predictions_path = os.path.join(out_dir, "predictions.jsonl")

    db = SessionLocal()
    try:
        if not args.skip_check:
            check_taxonomy(db)

        if args.mode == "eval":
            id_to_domain = gold_incident_domains(db)
            if not id_to_domain:
                print(
                    "No human gold rows found. Run scripts/apply_migrations.py "
                    "first so classified_by='human' is set."
                )
                sys.exit(1)
            for exemplar_id in tax.FEW_SHOT_INCIDENT_IDS:
                id_to_domain.pop(exemplar_id, None)
            if args.sample:
                targets = stratified_sample(id_to_domain, args.sample, args.seed)
            else:
                targets = sorted(id_to_domain.keys())
        else:
            ids = unclassified_incident_ids(db)
            targets = random_sample(ids, args.sample, args.seed) if args.sample else ids

        done = already_done_ids(predictions_path)
        pending = [i for i in targets if i not in done]
        if args.limit:
            pending = pending[: args.limit]

        print(
            f"mode={args.mode} run={run_name} targets={len(targets)} "
            f"already_done={len(done)} to_process={len(pending)}"
        )
        if not pending:
            print("Nothing to do.")
            return

        client = create_llm_client()
        service = LlmClassificationService(db, client)

        ok_count = 0
        fail_count = 0
        with open(predictions_path, "a", encoding="utf-8") as out:
            for n, incident_id in enumerate(pending, start=1):
                try:
                    result = service.classify_incident(incident_id)
                    record = {"incident_id": incident_id, "ok": True, **result.model_dump()}
                    if args.mode == "backfill":
                        saved = service.save_llm_classification(incident_id, result)
                        record["saved_to_db"] = saved
                    ok_count += 1
                    status = f"{result.risk_domain} / {result.risk_subdomain}"
                except (ClassificationError, LlmClientError) as exc:
                    record = {"incident_id": incident_id, "ok": False, "error": str(exc)}
                    fail_count += 1
                    status = f"FAILED: {exc}"
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
                out.flush()
                print(f"[{n}/{len(pending)}] incident {incident_id}: {status}")

        print(
            f"\nDone. ok={ok_count} failed={fail_count} "
            f"predictions -> {os.path.relpath(predictions_path)}"
        )
        if args.mode == "eval":
            print("Eval mode wrote NO database rows. Score with evaluate_classifier.py.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
