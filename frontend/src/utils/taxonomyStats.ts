import type { ClassificationBreakdownItem } from "../interfaces";

/** Share (0-1) of `name` among the items' incident counts. */
export function shareOf(items: ClassificationBreakdownItem[] | undefined, name: string): number {
  if (!items?.length) return 0;
  const total = items.reduce((sum, i) => sum + i.incident_count, 0);
  const count = items.find((i) => i.name === name)?.incident_count ?? 0;
  return total ? count / total : 0;
}

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** "+40 pts" / "−12 pts" difference between two shares. */
export function pointsDiff(share: number, baseline: number): string {
  const diff = Math.round((share - baseline) * 100);
  return `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} pts`;
}

/** "▲ 41%" style label and tone for a period-over-period change. */
export function changeKpi(change: number | null): { value: string; tone?: "up" | "down" } {
  if (change === null) return { value: "–" };
  return { value: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%`, tone: change >= 0 ? "up" : "down" };
}

export function isoDaysAgo(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
