const PALETTE = [
  "#e0603a",
  "#2aa7d8",
  "#9168c9",
  "#e0a32e",
  "#4fa35a",
  "#c6608f",
  "#7e93ad",
] as const;

const DOMAIN_COLOR_MAP: Record<string, string> = {
  "malicious actors and misuse": PALETTE[0],
  "ai system safety, failures, and limitations": PALETTE[1],
  "discrimination and toxicity": PALETTE[2],
  misinformation: PALETTE[3],
  "privacy and security": PALETTE[4],
  "human-computer interaction": PALETTE[5],
  "socioeconomic and environmental harms": PALETTE[6],
};

function normalize(name: string): string {
  return name
    .replace(/&amp;/gi, "and")
    .replace(/&/g, "and")
    .toLowerCase()
    .trim();
}

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Stable color per risk domain name — known taxonomy domains get their
 * canonical hue, anything else falls back to a deterministic hash so the
 * same unrecognized name always renders the same color. */
export function getDomainColor(name: string | null | undefined): string {
  if (!name) return PALETTE[6];
  const key = normalize(name);
  if (DOMAIN_COLOR_MAP[key]) return DOMAIN_COLOR_MAP[key];
  return PALETTE[hashString(key) % PALETTE.length];
}

export function domainBadgeStyle(color: string) {
  return {
    dot: color,
    background: `color-mix(in srgb, ${color} 15%, var(--surface))`,
    color: `color-mix(in srgb, ${color} 82%, var(--fg))`,
    border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
  };
}
