const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/** The MIT taxonomy CSV stores a handful of literal HTML entities (e.g.
 * "Privacy &amp; Security") instead of the decoded character. */
export function decodeEntities(value: string): string {
  return value.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;/g,
    (match) => HTML_ENTITIES[match] ?? match,
  );
}

export function formatIncidentDate(iso: string | null): string {
  if (!iso) return "Undated";
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}

/** Organization names are stored as slugs ("openai", "unknown-bank"). */
export function formatOrgName(slug: string): string {
  return decodeEntities(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNamedOrg(slug: string | null | undefined): slug is string {
  return typeof slug === "string" && slug !== "" && slug !== "unknown" && !slug.startsWith("unknown-");
}

/** First named organization in a list, if any. */
export function firstNamedOrg(orgs: string[] | null | undefined): string | null {
  const named = orgs?.find(isNamedOrg);
  return named ? formatOrgName(named) : null;
}

export function formatPercent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function pluralize(count: number, noun: string, plural = `${noun}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? noun : plural}`;
}
