import {
  MIT_CAUSAL,
  MIT_DOMAINS,
  type CausalCategory,
  type CausalDimension,
  type CausalDimensionInfo,
  type MitDomain,
  type MitSubdomain,
} from "../constants/mitTaxonomy";
import type { IncidentListParams } from "../interfaces";

function normalize(name: string): string {
  return name
    .replace(/&amp;/gi, "&")
    .replace(/\band\b/gi, "&")
    .replace(/[^a-z0-9&]+/gi, " ")
    .trim()
    .toLowerCase();
}

const DOMAIN_BY_NAME = new Map(MIT_DOMAINS.map((d) => [normalize(d.name), d]));
const SUBDOMAIN_BY_NAME = new Map(
  MIT_DOMAINS.flatMap((d) => d.subdomains.map((s) => [normalize(s.name), { domain: d, subdomain: s }] as const)),
);

export function findDomainByName(name: string | null | undefined): MitDomain | undefined {
  return name ? DOMAIN_BY_NAME.get(normalize(name)) : undefined;
}

export function findDomainByNumber(n: number | string | null | undefined): MitDomain | undefined {
  return MIT_DOMAINS.find((d) => d.number === Number(n));
}

export function findSubdomainByName(
  name: string | null | undefined,
): { domain: MitDomain; subdomain: MitSubdomain } | undefined {
  return name ? SUBDOMAIN_BY_NAME.get(normalize(name)) : undefined;
}

export function findSubdomainByCode(
  code: string | null | undefined,
): { domain: MitDomain; subdomain: MitSubdomain } | undefined {
  if (!code) return undefined;
  const domain = findDomainByNumber(code.split(".")[0]);
  const subdomain = domain?.subdomains.find((s) => s.code === code);
  return domain && subdomain ? { domain, subdomain } : undefined;
}

export function findCausalDimension(dimension: string | undefined): CausalDimensionInfo | undefined {
  return MIT_CAUSAL.find((d) => d.dimension === dimension);
}

export function findCausalCategory(
  dimension: string | undefined,
  slugOrName: string | null | undefined,
): CausalCategory | undefined {
  if (!slugOrName) return undefined;
  const key = slugOrName.toLowerCase();
  return findCausalDimension(dimension)?.categories.find(
    (c) => c.slug === key || c.name.toLowerCase() === key,
  );
}

/** CSS colour for a domain number; unknown domains fall back to neutral. */
export function domainColor(domain: MitDomain | number | undefined): string {
  const n = typeof domain === "number" ? domain : domain?.number;
  return n ? `var(--d${n})` : "var(--fg-faint)";
}

export function domainColorByName(name: string | null | undefined): string {
  return domainColor(findDomainByName(name));
}

export const taxonomyPaths = {
  index: "/taxonomy",
  domain: (n: number) => `/taxonomy/domain/${n}`,
  subdomain: (code: string) => `/taxonomy/subdomain/${code}`,
  causal: (dimension: CausalDimension, slug: string) => `/taxonomy/causal/${dimension}/${slug}`,
};

export function domainPathByName(name: string | null | undefined): string | undefined {
  const domain = findDomainByName(name);
  return domain && taxonomyPaths.domain(domain.number);
}

export function subdomainPathByName(name: string | null | undefined): string | undefined {
  const match = findSubdomainByName(name);
  return match && taxonomyPaths.subdomain(match.subdomain.code);
}

export function causalPathByName(dimension: CausalDimension, name: string | null | undefined) {
  const category = findCausalCategory(dimension, name);
  return category && taxonomyPaths.causal(dimension, category.slug);
}

// Maps a causal dimension to the API filter parameter it sets.
export const CAUSAL_PARAM: Record<CausalDimension, "causal_entity" | "intent" | "timing"> = {
  entity: "causal_entity",
  intent: "intent",
  timing: "timing",
};

export function causalFilter(dimension: CausalDimension, name: string): Partial<IncidentListParams> {
  return { [CAUSAL_PARAM[dimension]]: name };
}
