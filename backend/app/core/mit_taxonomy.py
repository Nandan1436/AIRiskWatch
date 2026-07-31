"""The MIT AI Risk Repository taxonomy (Slattery et al.), as used by the Phase 2
classifier and evaluation harness.

This module is the single source of truth for the valid domain / subdomain /
causal-axis strings. The strings MUST match the seed's stored form exactly —
i.e. the human gold labels in `mit_classification` after `import_seed.py`'s
`strip_taxonomy_prefix` (leading "1.2. " numbering removed). Descriptions are
transcribed from the public MIT AI Risk Repository domain + causal taxonomies;
they are prompt context only and are not stored.

Use `check_missing_against_db(...)` before spending API quota to assert every
distinct gold string in the DB is present here — that catches transcription
typos early. Comparisons go through `normalize()` so an HTML-entity quirk in the
seed (`&amp;` vs `&`) can't silently break scoring.
"""
from __future__ import annotations

import html

# ---------------------------------------------------------------------------
# Domains and subdomains
# ---------------------------------------------------------------------------
# domain -> {"description": str, "subdomains": {subdomain: description}}
TAXONOMY: dict[str, dict] = {
    "Discrimination and Toxicity": {
        "description": (
            "Harms from the AI system treating people unfairly or exposing them "
            "to toxic, hateful, or otherwise harmful content."
        ),
        "subdomains": {
            "Unfair discrimination and misrepresentation": (
                "Unequal treatment of individuals or groups by AI, often based on "
                "race, gender, or other sensitive characteristics, resulting in "
                "unfair outcomes and unfair representation of those groups."
            ),
            "Exposure to toxic content": (
                "AI that exposes users to harmful, abusive, unsafe, or "
                "inappropriate content — e.g. hate speech, violence, extremism, "
                "illegal acts, or child sexual abuse material — or content that "
                "violates community norms such as profanity, inflammatory "
                "political speech, or pornography."
            ),
            "Unequal performance across groups": (
                "Accuracy and effectiveness of AI decisions and actions depends "
                "on group membership, where AI system design choices and biased "
                "training data lead to unequal outcomes, reduced benefits, "
                "increased effort, and alienation for some groups."
            ),
        },
    },
    "Privacy & Security": {
        "description": (
            "Harms to people's privacy or to the security of AI systems and the "
            "data and systems around them."
        ),
        "subdomains": {
            "Compromise of privacy by obtaining, leaking or correctly inferring sensitive information": (
                "AI systems that memorize and leak sensitive personal data or "
                "infer private information about individuals without their "
                "consent — unexpected or unauthorized sharing of data can "
                "compromise privacy, assist identity theft, or leak confidential "
                "intellectual property."
            ),
            "AI system security vulnerabilities and attacks": (
                "Vulnerabilities that can be exploited in AI systems, software "
                "development toolchains, and hardware, resulting in unauthorized "
                "access, data and privacy breaches, or system manipulation "
                "causing unsafe outputs or behavior."
            ),
        },
    },
    "Misinformation": {
        "description": (
            "Harms from the AI system producing or amplifying false, misleading, "
            "or low-quality information."
        ),
        "subdomains": {
            "False or misleading information": (
                "AI systems that inadvertently generate or spread incorrect or "
                "deceptive information, leading to inaccurate beliefs and "
                "undermining user autonomy; users who act on false beliefs can "
                "suffer physical, emotional, or material harm."
            ),
            "Pollution of information ecosystem and loss of consensus reality": (
                "Highly personalized AI-generated content that creates 'filter "
                "bubbles' where individuals mostly see information matching "
                "their existing beliefs, undermining a shared sense of reality "
                "and weakening social cohesion and political processes."
            ),
        },
    },
    "Malicious Actors & Misuse": {
        "description": (
            "Harms from people deliberately using AI to cause harm — fraud, "
            "attacks, disinformation, surveillance, or weapons."
        ),
        "subdomains": {
            "Disinformation, surveillance, and influence at scale": (
                "Using AI to conduct large-scale disinformation campaigns, "
                "malicious surveillance, or targeted and sophisticated automated "
                "censorship and propaganda, aiming to manipulate political "
                "processes, public opinion, and behavior."
            ),
            "Cyberattacks, weapon development or use, and mass harm": (
                "Using AI to develop cyberweapons (e.g. cheaper, more effective "
                "malware), to develop or enhance weapons (e.g. lethal autonomous "
                "weapons, or chemical/biological/radiological/nuclear weapons), "
                "or to use weapons to cause mass harm."
            ),
            "Fraud, scams, and targeted manipulation": (
                "Using AI to gain a personal advantage over others through "
                "cheating, fraud, scams, blackmail, or targeted manipulation of "
                "beliefs or behavior — e.g. AI-facilitated plagiarism, "
                "impersonating a trusted or fake individual for financial gain, "
                "or creating humiliating or non-consensual sexual imagery."
            ),
        },
    },
    "Human-Computer Interaction": {
        "description": (
            "Harms arising from how people interact with and relate to AI "
            "systems, including overreliance and loss of agency."
        ),
        "subdomains": {
            "Overreliance and unsafe use": (
                "Users anthropomorphizing, trusting, or relying on AI beyond its "
                "actual capabilities, leading to emotional or material dependence "
                "and inappropriate relationships with or expectations of AI. "
                "This trust can be exploited by malicious actors or lead to harm "
                "from unsafe use in critical situations (e.g. a medical "
                "emergency), and can compromise autonomy and weaken social ties."
            ),
            "Loss of human agency and autonomy": (
                "Humans delegating key decisions to AI, or AI making decisions "
                "that diminish human control and autonomy, potentially leaving "
                "people feeling disempowered, unable to shape a fulfilling life "
                "trajectory, or cognitively enfeebled."
            ),
        },
    },
    "Socioeconomic & Environmental Harms": {
        "description": (
            "Broader societal, economic, and environmental harms from the "
            "development and deployment of AI."
        ),
        "subdomains": {
            "Power centralization and unfair distribution of benefits": (
                "AI-driven concentration of power and resources within certain "
                "entities or groups — especially those with access to or "
                "ownership of powerful AI systems — leading to inequitable "
                "distribution of benefits and increased societal inequality."
            ),
            "Increased inequality and decline in employment quality": (
                "Social and economic inequalities caused by widespread AI use, "
                "such as automating jobs, reducing employment quality, or "
                "producing exploitative dependencies between workers and their "
                "employers."
            ),
            "Economic and cultural devaluation of human effort": (
                "AI capable of creating economic or cultural value — including "
                "by reproducing human innovation and creativity in art, music, "
                "writing, code, or invention — destabilizing economic and social "
                "systems that rely on human effort; can reduce appreciation for "
                "human skills, disrupt creative and knowledge industries, and "
                "homogenize culture."
            ),
            "Competitive dynamics": (
                "Competition among AI developers or state-like actors in an AI "
                "'race' to rapidly develop, deploy, and apply AI systems for "
                "strategic or economic advantage, increasing the risk of "
                "releasing unsafe, error-prone systems."
            ),
            "Governance failure": (
                "Inadequate regulatory frameworks and oversight mechanisms that "
                "fail to keep pace with AI development, leading to ineffective "
                "governance and an inability to manage AI risks appropriately."
            ),
            "Environmental harm": (
                "The development and operation of AI systems causing "
                "environmental harm, such as through data center energy "
                "consumption or the materials and carbon footprint of AI "
                "hardware."
            ),
        },
    },
    "AI system safety, failures, and limitations": {
        "description": (
            "Harms from AI systems failing, being unreliable or opaque, or "
            "pursuing goals misaligned with human intent."
        ),
        "subdomains": {
            "Lack of capability or robustness": (
                "AI systems that fail to perform reliably or effectively under "
                "varying conditions, exposing them to errors and failures with "
                "significant consequences — especially in critical applications "
                "or areas requiring moral reasoning."
            ),
            "Lack of transparency or interpretability": (
                "Challenges in understanding or explaining AI decision-making "
                "processes, leading to mistrust, difficulty enforcing compliance "
                "standards or holding actors accountable for harms, and an "
                "inability to identify and correct errors."
            ),
            "AI pursuing its own goals in conflict with human goals or values": (
                "AI systems acting in conflict with ethical standards or human "
                "goals and values, especially the goals of designers or users. "
                "These misaligned behaviors may be introduced during design or "
                "development (e.g. reward hacking, goal misgeneralization) and "
                "can lead the AI to use dangerous capabilities such as "
                "manipulation, deception, or situational awareness to seek "
                "power, self-proliferate, or achieve other goals."
            ),
        },
    },
}

# ---------------------------------------------------------------------------
# Causal axes (each includes the third value "Other" that appears in gold data)
# ---------------------------------------------------------------------------
CAUSAL_ENTITIES: list[str] = ["AI", "Human", "Other"]
TIMINGS: list[str] = ["Pre-deployment", "Post-deployment", "Other"]
INTENTS: list[str] = ["Intentional", "Unintentional", "Other"]

AXIS_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "causal_entity": {
        "AI": (
            "the risk arises from a decision or action made by the AI system "
            "itself, e.g. generating harmful content or disempowering humans"
        ),
        "Human": (
            "the risk arises from human actions, e.g. choosing poor training "
            "data, intentional malicious design, or improper use of the AI "
            "system"
        ),
        "Other": "the focal entity is not clearly human or AI, or is ambiguous",
    },
    "timing": {
        "Pre-deployment": (
            "the risk arises before the AI system is fully developed and put "
            "into use, e.g. vulnerabilities introduced during training or "
            "coding errors"
        ),
        "Post-deployment": (
            "the risk arises after the AI has been deployed to end users, e.g. "
            "misuse of the AI for harmful purposes"
        ),
        "Other": (
            "the risk has no clearly defined time of occurrence, or may occur "
            "both before and after deployment"
        ),
    },
    "intent": {
        "Intentional": (
            "the risk occurs as an expected outcome of pursuing a specific "
            "goal, e.g. an AI intentionally programmed to act deceptively or "
            "exhibit bias"
        ),
        "Unintentional": (
            "the risk reflects an unintended consequence, e.g. an AI system "
            "inadvertently developing bias due to incomplete training data"
        ),
        "Other": (
            "intent is not clearly specified, or the risk may occur both "
            "intentionally and unintentionally"
        ),
    },
}

# ---------------------------------------------------------------------------
# Derived lookups
# ---------------------------------------------------------------------------
DOMAINS: list[str] = list(TAXONOMY.keys())

SUBDOMAINS: list[str] = [
    subdomain
    for domain in TAXONOMY.values()
    for subdomain in domain["subdomains"]
]

# subdomain -> its parent domain
SUBDOMAIN_TO_DOMAIN: dict[str, str] = {
    subdomain: domain_name
    for domain_name, domain in TAXONOMY.items()
    for subdomain in domain["subdomains"]
}

# ---------------------------------------------------------------------------
# Few-shot exemplars — one per domain, held OUT of the eval set.
# incident_id points at a clean single-classification gold incident; the text
# (title + description) is loaded from the DB at prompt-build time, the gold
# label below is shown to the model as the target answer.
# ---------------------------------------------------------------------------
FEW_SHOT_EXEMPLARS: list[dict] = [
    {
        "incident_id": 1,
        "risk_domain": "Discrimination and Toxicity",
        "risk_subdomain": "Exposure to toxic content",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Unintentional",
    },
    {
        "incident_id": 26,
        "risk_domain": "Privacy & Security",
        "risk_subdomain": "AI system security vulnerabilities and attacks",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Unintentional",
    },
    {
        "incident_id": 39,
        "risk_domain": "Misinformation",
        "risk_subdomain": "False or misleading information",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Intentional",
    },
    {
        "incident_id": 28,
        "risk_domain": "Malicious Actors & Misuse",
        "risk_subdomain": "Fraud, scams, and targeted manipulation",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Intentional",
    },
    {
        "incident_id": 17,
        "risk_domain": "Human-Computer Interaction",
        "risk_subdomain": "Overreliance and unsafe use",
        "causal_entity": "AI",
        "timing": "Pre-deployment",
        "intent": "Unintentional",
    },
    {
        "incident_id": 10,
        "risk_domain": "Socioeconomic & Environmental Harms",
        "risk_subdomain": "Increased inequality and decline in employment quality",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Intentional",
    },
    {
        "incident_id": 2,
        "risk_domain": "AI system safety, failures, and limitations",
        "risk_subdomain": "Lack of capability or robustness",
        "causal_entity": "AI",
        "timing": "Post-deployment",
        "intent": "Unintentional",
    },
]

FEW_SHOT_INCIDENT_IDS: set[int] = {ex["incident_id"] for ex in FEW_SHOT_EXEMPLARS}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def normalize(value: str | None) -> str:
    """Canonicalize a taxonomy string for comparison.

    Unescapes HTML entities (the seed carries a raw `&`, but a re-import from a
    differently-encoded dump could carry `&amp;`) and collapses surrounding
    whitespace, so gold-vs-prediction comparison is robust to that quirk.
    """
    if value is None:
        return ""
    return html.unescape(value).strip()


def subdomains_for(domain: str) -> list[str]:
    return list(TAXONOMY.get(domain, {}).get("subdomains", {}).keys())


def is_valid_pair(domain: str, subdomain: str) -> bool:
    """True if `subdomain` belongs to `domain` (both normalized)."""
    want = normalize(subdomain)
    for candidate in subdomains_for(domain):
        if normalize(candidate) == want:
            return True
    return False


def taxonomy_prompt_block() -> str:
    """Render the full domain/subdomain taxonomy with descriptions for the
    system prompt."""
    lines: list[str] = []
    for domain_name, domain in TAXONOMY.items():
        lines.append(f"DOMAIN: {domain_name}")
        lines.append(f"  {domain['description']}")
        lines.append("  Subdomains:")
        for subdomain, description in domain["subdomains"].items():
            lines.append(f"    - {subdomain}: {description}")
        lines.append("")
    return "\n".join(lines).strip()


def axes_prompt_block() -> str:
    """Render the three causal axes with their allowed values for the prompt."""
    lines: list[str] = []
    labels = {
        "causal_entity": "causal_entity",
        "timing": "timing",
        "intent": "intent",
    }
    for axis, values in AXIS_DESCRIPTIONS.items():
        lines.append(f"{labels[axis]}:")
        for value, description in values.items():
            lines.append(f"    - {value}: {description}")
        lines.append("")
    return "\n".join(lines).strip()


def check_missing_against_db(
    gold_domains: set[str], gold_pairs: set[tuple[str, str]]
) -> dict[str, list]:
    """Compare distinct gold strings (from the DB) against this module.

    `gold_domains` = distinct normalized risk_domain values; `gold_pairs` =
    distinct normalized (risk_domain, risk_subdomain) pairs. Returns any values
    present in the DB but absent here — a non-empty result means a transcription
    mismatch to fix before running the batch.
    """
    known_domains = {normalize(d) for d in DOMAINS}
    known_pairs = {
        (normalize(domain_name), normalize(sub))
        for domain_name, domain in TAXONOMY.items()
        for sub in domain["subdomains"]
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
