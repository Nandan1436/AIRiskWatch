import type { CausalDimension } from "../constants/mitTaxonomy";
import type { IncidentListParams } from "../interfaces";
import {
  CAUSAL_PARAM,
  findCausalCategory,
  findDomainByNumber,
  findSubdomainByCode,
} from "./taxonomy";

// Incident-list filters live in the URL (/incidents?domain=4&since=12m&page=2)
// so Back, reload and shared links all restore the same view.

export type SinceOption = "" | "30d" | "12m" | "5y";

export const SINCE_OPTIONS: { value: SinceOption; label: string }[] = [
  { value: "", label: "Any time" },
  { value: "30d", label: "Last 30 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "5y", label: "Last 5 years" },
];

export interface IncidentUrlFilters {
  q: string;
  domain: string; // domain number
  sub: string; // subdomain code
  entity: string; // causal category slugs
  intent: string;
  timing: string;
  since: SinceOption;
}

export const FILTER_KEYS: (keyof IncidentUrlFilters)[] = [
  "q",
  "domain",
  "sub",
  "entity",
  "intent",
  "timing",
  "since",
];

export const CAUSAL_KEYS: CausalDimension[] = ["entity", "intent", "timing"];

export function readFilters(params: URLSearchParams): IncidentUrlFilters {
  const since = params.get("since") ?? "";
  return {
    q: params.get("q") ?? "",
    domain: params.get("domain") ?? "",
    sub: params.get("sub") ?? "",
    entity: params.get("entity") ?? "",
    intent: params.get("intent") ?? "",
    timing: params.get("timing") ?? "",
    since: SINCE_OPTIONS.some((o) => o.value === since) ? (since as SinceOption) : "",
  };
}

export function readPage(params: URLSearchParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sinceToDateFrom(since: SinceOption, now = new Date()): string | undefined {
  const d = new Date(now);
  if (since === "30d") d.setDate(d.getDate() - 30);
  else if (since === "12m") d.setFullYear(d.getFullYear() - 1);
  else if (since === "5y") d.setFullYear(d.getFullYear() - 5);
  else return undefined;
  return isoDate(d);
}

/** Converts URL filters (numbers, codes, slugs) into API filter values (names). */
export function toApiFilters(filters: IncidentUrlFilters): Omit<IncidentListParams, "limit" | "offset"> {
  const api: Omit<IncidentListParams, "limit" | "offset"> = {
    search: filters.q.trim() || undefined,
    risk_domain: findDomainByNumber(filters.domain)?.name,
    risk_subdomain: findSubdomainByCode(filters.sub)?.subdomain.name,
    date_from: sinceToDateFrom(filters.since),
  };
  for (const dimension of CAUSAL_KEYS) {
    const category = findCausalCategory(dimension, filters[dimension]);
    if (category) api[CAUSAL_PARAM[dimension]] = category.name;
  }
  return api;
}

export function hasActiveFilters(filters: IncidentUrlFilters): boolean {
  return FILTER_KEYS.some((key) => filters[key] !== "");
}
