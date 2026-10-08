import { SUBDOMAIN_CHECKS, type MitDomain, type MitSubdomain } from "../constants/mitTaxonomy";
import type { SearchResultItem } from "../interfaces";
import { findSubdomainByName } from "./taxonomy";

export type Severity = "high" | "medium" | "low";

export interface ChecklistItem {
  subdomain: MitSubdomain;
  question: string;
  severity: Severity;
  matches: SearchResultItem[];
}

export interface ChecklistGroup {
  domain: MitDomain;
  items: ChecklistItem[];
  matchCount: number;
}

// Severity reflects how many of the similar incidents fall in a subdomain.
function severityFor(count: number): Severity {
  if (count >= 5) return "high";
  if (count >= 2) return "medium";
  return "low";
}

/**
 * Turns semantic-search matches for a system description into a checklist:
 * one item per MIT subdomain the matches fall into, grouped by domain and
 * ordered by how many matches each has.
 */
export function buildChecklist(results: SearchResultItem[]): {
  groups: ChecklistGroup[];
  unclassified: number;
} {
  const unique = [...new Map(results.map((r) => [r.incident_id, r])).values()];
  const bySubdomain = new Map<string, { domain: MitDomain; subdomain: MitSubdomain; matches: SearchResultItem[] }>();
  let unclassified = 0;

  for (const result of unique) {
    const match = findSubdomainByName(result.risk_subdomain);
    if (!match) {
      unclassified += 1;
      continue;
    }
    const entry = bySubdomain.get(match.subdomain.code) ?? { ...match, matches: [] };
    entry.matches.push(result);
    bySubdomain.set(match.subdomain.code, entry);
  }

  const groups = new Map<number, ChecklistGroup>();
  for (const { domain, subdomain, matches } of bySubdomain.values()) {
    const group = groups.get(domain.number) ?? { domain, items: [], matchCount: 0 };
    group.items.push({
      subdomain,
      question: SUBDOMAIN_CHECKS[subdomain.code] ?? subdomain.definition,
      severity: severityFor(matches.length),
      matches,
    });
    group.matchCount += matches.length;
    groups.set(domain.number, group);
  }

  const sorted = [...groups.values()].sort((a, b) => b.matchCount - a.matchCount);
  for (const group of sorted) group.items.sort((a, b) => b.matches.length - a.matches.length);
  return { groups: sorted, unclassified };
}
