from __future__ import annotations

import argparse
import csv
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sklearn.metrics import (  # noqa: E402
    confusion_matrix,
    precision_recall_fscore_support,
)
from sqlalchemy import select  # noqa: E402

from app.core import mit_taxonomy as tax  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.mit_classification_model import MitClassification  # noqa: E402

RESULTS_ROOT = os.path.join(os.path.dirname(__file__), "..", "eval_results")


def _canon(value: str | None, options: list[str]) -> str | None:
    if value is None:
        return None
    target = tax.normalize(value).casefold()
    for option in options:
        if tax.normalize(option).casefold() == target:
            return option
    return tax.normalize(value)


def load_predictions(path: str) -> dict[int, dict]:
    preds: dict[int, dict] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if not record.get("ok"):
                continue
            preds[int(record["incident_id"])] = record
    return preds


def load_gold(db, incident_ids: list[int]) -> dict[int, dict]:
    rows = db.execute(
        select(
            MitClassification.incident_id,
            MitClassification.risk_domain,
            MitClassification.risk_subdomain,
            MitClassification.causal_entity,
            MitClassification.timing,
            MitClassification.intent,
        )
        .where(MitClassification.classified_by == "human")
        .where(MitClassification.incident_id.in_(incident_ids))
    ).all()
    gold: dict[int, dict] = {}
    for incident_id, domain, sub, entity, timing, intent in rows:
        if incident_id in gold:
            continue
        gold[incident_id] = {
            "risk_domain": _canon(domain, tax.DOMAINS),
            "risk_subdomain": _canon(sub, tax.SUBDOMAINS),
            "causal_entity": _canon(entity, tax.CAUSAL_ENTITIES),
            "timing": _canon(timing, tax.TIMINGS),
            "intent": _canon(intent, tax.INTENTS),
        }
    return gold


def _accuracy(pairs: list[tuple]) -> float:
    if not pairs:
        return 0.0
    correct = sum(1 for g, p in pairs if g == p)
    return correct / len(pairs)


def compute_metrics(preds: dict[int, dict], gold: dict[int, dict]) -> dict:
    ids = sorted(set(preds) & set(gold))
    y_true_domain = [gold[i]["risk_domain"] for i in ids]
    y_pred_domain = [_canon(preds[i].get("risk_domain"), tax.DOMAINS) for i in ids]
    y_true_sub = [gold[i]["risk_subdomain"] for i in ids]
    y_pred_sub = [_canon(preds[i].get("risk_subdomain"), tax.SUBDOMAINS) for i in ids]
    y_pred_sub2 = [
        _canon(preds[i].get("risk_subdomain_second"), tax.SUBDOMAINS) for i in ids
    ]

    domain_acc = _accuracy(list(zip(y_true_domain, y_pred_domain)))
    p, r, f1, support = precision_recall_fscore_support(
        y_true_domain, y_pred_domain, labels=tax.DOMAINS, zero_division=0
    )
    per_domain = {
        tax.DOMAINS[i]: {
            "precision": float(p[i]),
            "recall": float(r[i]),
            "f1": float(f1[i]),
            "support": int(support[i]),
        }
        for i in range(len(tax.DOMAINS))
    }
    macro_f1_domain = float(sum(f1) / len(f1)) if len(f1) else 0.0

    _, _, f1_sub, _ = precision_recall_fscore_support(
        y_true_sub, y_pred_sub, labels=tax.SUBDOMAINS, zero_division=0
    )
    macro_f1_sub = float(sum(f1_sub) / len(f1_sub)) if len(f1_sub) else 0.0
    top1 = _accuracy(list(zip(y_true_sub, y_pred_sub)))
    top2 = (
        sum(1 for g, p1, p2 in zip(y_true_sub, y_pred_sub, y_pred_sub2) if g in (p1, p2))
        / len(ids)
        if ids
        else 0.0
    )

    axis_acc = {
        axis: _accuracy(
            [
                (gold[i][axis], _canon(preds[i].get(axis), options))
                for i in ids
            ]
        )
        for axis, options in (
            ("causal_entity", tax.CAUSAL_ENTITIES),
            ("timing", tax.TIMINGS),
            ("intent", tax.INTENTS),
        )
    }

    cm = confusion_matrix(y_true_domain, y_pred_domain, labels=tax.DOMAINS).tolist()

    conf_correct = [
        preds[i].get("confidence")
        for i in ids
        if preds[i].get("confidence") is not None
        and gold[i]["risk_domain"] == _canon(preds[i].get("risk_domain"), tax.DOMAINS)
    ]
    conf_wrong = [
        preds[i].get("confidence")
        for i in ids
        if preds[i].get("confidence") is not None
        and gold[i]["risk_domain"] != _canon(preds[i].get("risk_domain"), tax.DOMAINS)
    ]
    mean_conf_correct = sum(conf_correct) / len(conf_correct) if conf_correct else None
    mean_conf_wrong = sum(conf_wrong) / len(conf_wrong) if conf_wrong else None

    sub_conf: dict[str, dict[str, int]] = {
        g: {p: 0 for p in tax.SUBDOMAINS} for g in tax.SUBDOMAINS
    }
    for g, p in zip(y_true_sub, y_pred_sub):
        if g in sub_conf and p in sub_conf[g]:
            sub_conf[g][p] += 1

    return {
        "n_scored": len(ids),
        "n_predictions": len(preds),
        "n_missing_gold": len(set(preds) - set(gold)),
        "domain_accuracy": domain_acc,
        "macro_f1_domain": macro_f1_domain,
        "macro_f1_subdomain": macro_f1_sub,
        "subdomain_top1_accuracy": top1,
        "subdomain_top2_accuracy": top2,
        "per_axis_accuracy": axis_acc,
        "per_domain": per_domain,
        "confusion_matrix": cm,
        "confusion_labels": tax.DOMAINS,
        "calibration": {
            "mean_confidence_correct": mean_conf_correct,
            "mean_confidence_incorrect": mean_conf_wrong,
        },
        "_subdomain_confusion": sub_conf,
    }


def _pct(x: float | None) -> str:
    return "n/a" if x is None else f"{x * 100:.1f}%"


def render_report(metrics: dict, run_name: str) -> str:
    lines: list[str] = []
    lines.append(f"# Classifier evaluation — run `{run_name}`\n")
    lines.append(
        f"Scored **{metrics['n_scored']}** incidents "
        f"({metrics['n_missing_gold']} predictions had no gold label and were skipped).\n"
    )
    lines.append("## Headline\n")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| Domain accuracy | {_pct(metrics['domain_accuracy'])} |")
    lines.append(f"| Domain macro-F1 | {metrics['macro_f1_domain']:.3f} |")
    lines.append(f"| Subdomain macro-F1 | {metrics['macro_f1_subdomain']:.3f} |")
    lines.append(f"| Subdomain top-1 accuracy | {_pct(metrics['subdomain_top1_accuracy'])} |")
    lines.append(f"| Subdomain top-2 accuracy | {_pct(metrics['subdomain_top2_accuracy'])} |")
    for axis, acc in metrics["per_axis_accuracy"].items():
        lines.append(f"| {axis} accuracy | {_pct(acc)} |")
    cal = metrics["calibration"]
    lines.append(
        f"| Mean confidence (correct / incorrect) | "
        f"{_pct(cal['mean_confidence_correct'])} / {_pct(cal['mean_confidence_incorrect'])} |"
    )
    lines.append("")

    lines.append("## Per-domain precision / recall / F1\n")
    lines.append("| Domain | Precision | Recall | F1 | Support |")
    lines.append("|---|---|---|---|---|")
    for domain, m in metrics["per_domain"].items():
        lines.append(
            f"| {domain} | {m['precision']:.3f} | {m['recall']:.3f} | "
            f"{m['f1']:.3f} | {m['support']} |"
        )
    lines.append("")

    lines.append("## Domain confusion matrix (rows = gold, cols = predicted)\n")
    labels = metrics["confusion_labels"]
    short = [f"D{i + 1}" for i in range(len(labels))]
    lines.append("Legend: " + "; ".join(f"{s}={l}" for s, l in zip(short, labels)) + "\n")
    lines.append("| gold \\ pred | " + " | ".join(short) + " |")
    lines.append("|" + "---|" * (len(short) + 1))
    for i, row in enumerate(metrics["confusion_matrix"]):
        lines.append(f"| {short[i]} | " + " | ".join(str(c) for c in row) + " |")
    lines.append("")
    return "\n".join(lines)


def write_subdomain_confusion_csv(path: str, sub_conf: dict[str, dict[str, int]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["gold \\ predicted"] + tax.SUBDOMAINS)
        for gold_sub in tax.SUBDOMAINS:
            writer.writerow([gold_sub] + [sub_conf[gold_sub][p] for p in tax.SUBDOMAINS])


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 2 offline evaluation harness")
    parser.add_argument("--run-name", required=True, help="subdir under eval_results/")
    args = parser.parse_args()

    out_dir = os.path.join(RESULTS_ROOT, args.run_name)
    predictions_path = os.path.join(out_dir, "predictions.jsonl")
    if not os.path.exists(predictions_path):
        print(f"No predictions at {os.path.relpath(predictions_path)}")
        sys.exit(1)

    preds = load_predictions(predictions_path)
    if not preds:
        print("No successful predictions to score.")
        sys.exit(1)

    db = SessionLocal()
    try:
        gold = load_gold(db, list(preds.keys()))
    finally:
        db.close()

    metrics = compute_metrics(preds, gold)
    sub_conf = metrics.pop("_subdomain_confusion")

    with open(os.path.join(out_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)
    report = render_report(metrics, args.run_name)
    with open(os.path.join(out_dir, "report.md"), "w", encoding="utf-8") as f:
        f.write(report)
    write_subdomain_confusion_csv(
        os.path.join(out_dir, "subdomain_confusion.csv"), sub_conf
    )

    print(report)
    print(f"\nWrote metrics.json, report.md, subdomain_confusion.csv -> {os.path.relpath(out_dir)}")


if __name__ == "__main__":
    main()
