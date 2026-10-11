# Prompts

Every LLM prompt in the backend. Edit these files to change what the model
sees; no code changes needed. `{{name}}` marks a value the code fills in
(`app.prompts.render`), and a missing value raises an error instead of
sending a broken prompt.

| File | Used by | Purpose |
|---|---|---|
| `classification/system.md` | `llm_classification_service` | Role, output rules; `{{taxonomy}}` and `{{axes}}` are built from `taxonomy.json` |
| `classification/user.md` | `llm_classification_service` | Few-shot examples + the incident to classify |
| `classification/repair.md` | `llm_classification_service` | Retry message when an answer fails validation |
| `classification/taxonomy.json` | `core/mit_taxonomy.py` | MIT domains and subdomains with the paper's definitions, and the causal axes. Also the source of the allowed labels |
| `classification/examples.json` | `core/mit_taxonomy.py` | Few-shot examples, one gold incident per domain; title and description are loaded from the database |
| `ingestion/relevance_*.md` | `ingestion_service` | Is this article a real AI incident? |
| `ingestion/report_*.md` | `ingestion_service` | Report metadata: title, authors, language |
| `ingestion/incident_*.md` | `ingestion_service` | Incident record: title, description, date, parties |
| `search/summary_*.md` | `search_service` | Summary of search results |
| `common/json_repair.md` | `core/llm_client.py` | Retry message when a reply isn't valid JSON |

When editing the classifier:

- Subdomain and domain **names** must stay spelled as in the seed data's human
  labels; `scripts/run_classification.py` checks them against the database.
- An example's labels must match that incident's gold labels; the incident is
  then excluded from evaluation.
- Mind the size. The classification prompt is about 3.6K tokens, and Groq's
  free tier allows 8K tokens per minute including the answer.
- A 39-example variant (two per subdomain) scored worse on Gemini and was
  reverted.
