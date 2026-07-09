import type { IncidentClassification } from "../interfaces";

/** The seeded data occasionally repeats an identical classification row for
 * the same incident — collapse those before rendering one badge per row. */
export function dedupeClassifications(
  classifications: IncidentClassification[],
): IncidentClassification[] {
  const seen = new Set<string>();
  return classifications.filter((c) => {
    const key = `${c.risk_domain}\0${c.risk_subdomain}\0${c.causal_entity}\0${c.timing}\0${c.intent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
