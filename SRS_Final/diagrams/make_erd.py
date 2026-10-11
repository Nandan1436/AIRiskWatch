"""Generate the Chen-notation ERD as Graphviz DOT with hand-placed (pinned) positions.

Coordinates are in inches with y growing downward; they are converted to points
and flipped for Graphviz (rendered with neato -n2).
"""
import sys

H = 14.6  # canvas height used for the y flip

ENTITY = 'shape=box, style="filled", fillcolor="#DBEAFE", color="#1D4ED8", penwidth=2.4, fontname="Arial", fontsize=21, margin="0.22,0.12"'
RELATION = 'shape=diamond, style="filled", fillcolor="#FEF3C7", color="#B45309", penwidth=2, fontname="Arial", fontsize=16, margin="0.06,0.03"'
ATTR = 'shape=ellipse, style="filled", fillcolor="#ECFDF5", color="#15803D", penwidth=1.5, fontname="Arial", fontsize=16, margin="0.10,0.04"'
KEY = 'shape=ellipse, style="filled", fillcolor="#FEF9C3", color="#A16207", penwidth=1.8, fontname="Arial", fontsize=16, margin="0.10,0.04"'
MULTI = ATTR + ', peripheries=2'

nodes = []  # (id, label, style, x, y)
edges = []  # (a, b, label)


def ent(nid, x, y):
    nodes.append((nid, f"<<B>{nid}</B>>", ENTITY, x, y))


def rel(nid, x, y):
    nodes.append((nid, f"<<B>{nid}</B>>", RELATION, x, y))


def attr(owner, name, x, y, key=False, multi=False):
    nid = f"{owner}__{name}"
    style = KEY if key else (MULTI if multi else ATTR)
    label = f"<<U>{name}</U>>" if key else f'"{name}"'
    nodes.append((nid, label, style, x, y))
    edges.append((owner, nid, None))


# ---- incident ---------------------------------------------------------------
ent("incident", 3.0, 2.9)
attr("incident", "incident_id", 0.95, 0.85, key=True)
attr("incident", "title", 2.4, 0.45)
attr("incident", "description", 4.15, 0.5)
attr("incident", "incident_date", 5.15, 1.75)
attr("incident", "embedding", 0.95, 1.95)
attr("incident", "alleged_deployer", 1.3, 3.45, multi=True)
attr("incident", "alleged_developer", 2.0, 4.95, multi=True)
attr("incident", "harmed_parties", 5.15, 3.95, multi=True)

# ---- report -----------------------------------------------------------------
ent("report", 10.0, 2.9)
attr("report", "report_number", 8.15, 1.6, key=True)
attr("report", "title", 8.9, 0.55)
attr("report", "url", 10.35, 0.45)
attr("report", "source_domain", 11.85, 0.95)
attr("report", "authors", 12.25, 2.0)
attr("report", "published_date", 12.0, 3.85)
attr("report", "language", 12.25, 4.8)
attr("report", "text", 10.85, 5.0)
attr("report", "embedding", 9.2, 4.65)

# ---- documented_in / incident_report ------------------------------------------
rel("documented_in", 6.6, 2.9)
edges.append(("incident", "documented_in", "M"))
edges.append(("documented_in", "report", "N"))
ent("incident_report", 6.6, 5.0)
edges.append(("documented_in", "incident_report", None))
attr("incident_report", "incident_id", 5.95, 6.2, key=True)
attr("incident_report", "report_id", 7.75, 6.2, key=True)

# ---- mit_classification ------------------------------------------------------
rel("classified_as", 3.9, 6.55)
edges.append(("incident", "classified_as", "1"))
edges.append(("classified_as", "mit_classification", "1"))
ent("mit_classification", 3.9, 8.8)
attr("mit_classification", "id", 1.5, 7.6, key=True)
attr("mit_classification", "confidence", 5.75, 7.3)
attr("mit_classification", "published", 6.9, 8.05)
attr("mit_classification", "classified_by", 6.85, 9.05)
attr("mit_classification", "intent", 6.6, 10.05)
attr("mit_classification", "classified_at", 6.0, 11.1)
attr("mit_classification", "timing", 4.5, 11.6)
attr("mit_classification", "causal_entity", 2.75, 11.35)
attr("mit_classification", "risk_subdomain", 1.3, 10.4)
attr("mit_classification", "risk_domain", 1.1, 9.5)

# ---- user / digest_delivery ---------------------------------------------------
ent("user", 9.9, 8.7)
attr("user", "id", 8.1, 7.3, key=True)
attr("user", "email", 9.45, 7.0)
attr("user", "username", 12.1, 8.1)
attr("user", "email_notifications", 11.65, 7.0)
attr("user", "password_hash", 12.2, 8.95)
attr("user", "role", 12.5, 10.3)
attr("user", "updated_at", 11.85, 11.45)
attr("user", "google_sub", 8.15, 8.55)
attr("user", "is_active", 7.95, 9.65)
attr("user", "created_at", 8.4, 10.6)

rel("receives", 9.9, 11.25)
edges.append(("user", "receives", "1"))
edges.append(("receives", "digest_delivery", "1"))
ent("digest_delivery", 9.9, 13.05)
attr("digest_delivery", "user_id", 7.7, 12.4, key=True)
attr("digest_delivery", "digest_month", 7.75, 13.8)
attr("digest_delivery", "status", 12.05, 12.4)
attr("digest_delivery", "sent_at", 12.0, 13.8)

lines = [
    "graph ERD {",
    '  graph [splines=line, outputorder=edgesfirst, pad="0.15", bgcolor="white"];',
    '  edge [color="#475569", penwidth=1.6, fontname="Arial", fontsize=19, fontcolor="#1E293B"];',
]
for nid, label, style, x, y in nodes:
    lines.append(f'  "{nid}" [label={label}, {style}, pos="{x * 72:.1f},{(H - y) * 72:.1f}!"];')
for a, b, label in edges:
    extra = f', label=<<B>{label}</B>>' if label else ""
    lines.append(f'  "{a}" -- "{b}" [len=1{extra}];')
lines.append("}")
with open(sys.argv[1], "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print(len(nodes), "nodes", len(edges), "edges")
