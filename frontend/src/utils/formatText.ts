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
