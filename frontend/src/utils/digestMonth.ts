// Digest months arrive as the first day of the month ("2026-09-01").

export function toYearMonth(month: string): string {
  return month.slice(0, 7);
}

export function formatDigestMonth(month: string, style: "long" | "short" = "long"): string {
  const [year, mo] = month.split("-").map(Number);
  return new Date(year, mo - 1, 1).toLocaleDateString(undefined, {
    month: style,
    year: "numeric",
  });
}
