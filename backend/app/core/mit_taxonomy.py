from __future__ import annotations

import html

from app import prompts

# The taxonomy text and the few-shot examples live in
# app/prompts/classification/ so they can be edited without code changes;
# everything below is derived from them.
_TAXONOMY_FILE = prompts.load_json("classification/taxonomy.json")
_EXAMPLES_FILE = prompts.load_json("classification/examples.json")

DOMAIN_DESCRIPTIONS: dict[str, str] = {
    domain["name"]: domain["description"] for domain in _TAXONOMY_FILE["domains"]
}

TAXONOMY: dict[str, dict[str, str]] = {
    domain["name"]: {sub["name"]: sub["definition"] for sub in domain["subdomains"]}
    for domain in _TAXONOMY_FILE["domains"]
}

AXIS_DESCRIPTIONS: dict[str, dict[str, str]] = _TAXONOMY_FILE["causal_axes"]

CAUSAL_ENTITIES: list[str] = list(AXIS_DESCRIPTIONS["causal_entity"])
TIMINGS: list[str] = list(AXIS_DESCRIPTIONS["timing"])
INTENTS: list[str] = list(AXIS_DESCRIPTIONS["intent"])

DOMAINS: list[str] = list(TAXONOMY)

SUBDOMAINS: list[str] = [sub for subs in TAXONOMY.values() for sub in subs]

SUBDOMAIN_TO_DOMAIN: dict[str, str] = {
    sub: domain for domain, subs in TAXONOMY.items() for sub in subs
}

FEW_SHOT_EXEMPLARS: list[dict] = [
    {**ex, "risk_domain": SUBDOMAIN_TO_DOMAIN[ex["risk_subdomain"]]}
    for ex in _EXAMPLES_FILE["examples"]
]

# Gold incidents used as examples; evaluation must skip them.
FEW_SHOT_INCIDENT_IDS: set[int] = {ex["incident_id"] for ex in FEW_SHOT_EXEMPLARS}


def normalize(value: str | None) -> str:
    if value is None:
        return ""
    return html.unescape(value).strip()


def subdomains_for(domain: str) -> list[str]:
    return list(TAXONOMY.get(domain, {}))


def is_valid_pair(domain: str, subdomain: str) -> bool:
    want = normalize(subdomain)
    return any(normalize(candidate) == want for candidate in subdomains_for(domain))


def taxonomy_prompt_block() -> str:
    lines: list[str] = []
    for domain, subs in TAXONOMY.items():
        lines.append(f"DOMAIN: {domain}")
        lines.append(f"  {DOMAIN_DESCRIPTIONS[domain]}")
        lines.append("  Subdomains:")
        for sub, definition in subs.items():
            lines.append(f"    - {sub}: {definition}")
        lines.append("")
    return "\n".join(lines).strip()


def axes_prompt_block() -> str:
    lines: list[str] = []
    for axis, values in AXIS_DESCRIPTIONS.items():
        lines.append(f"{axis}:")
        for value, description in values.items():
            lines.append(f"    - {value}: {description}")
        lines.append("")
    return "\n".join(lines).strip()


def check_missing_against_db(
    gold_domains: set[str], gold_pairs: set[tuple[str, str]]
) -> dict[str, list]:
    known_domains = {normalize(d) for d in DOMAINS}
    known_pairs = {
        (normalize(domain), normalize(sub))
        for domain, subs in TAXONOMY.items()
        for sub in subs
    }
    missing_domains = sorted(
        d for d in gold_domains if normalize(d) not in known_domains
    )
    missing_pairs = sorted(
        p
        for p in gold_pairs
        if (normalize(p[0]), normalize(p[1])) not in known_pairs
    )
    return {"missing_domains": missing_domains, "missing_pairs": missing_pairs}
