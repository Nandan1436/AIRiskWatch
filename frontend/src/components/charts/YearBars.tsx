import type { CSSProperties } from "react";
import styles from "./Charts.module.css";

export interface YearValue {
  year: number;
  value: number;
}

interface YearBarsProps {
  points: YearValue[];
  color: string;
  formatValue?: (value: number) => string;
  /** Upper bound for bar height; defaults to the largest value. */
  max?: number;
}

/** Vertical bars per year; the most recent year is drawn solid. */
export function YearBars({ points, color, formatValue = String, max }: YearBarsProps) {
  const top = max ?? Math.max(1, ...points.map((p) => p.value));
  return (
    <div style={{ "--c": color } as CSSProperties}>
      <div className={styles.yearBars}>
        {points.map((p, i) => (
          <div
            key={p.year}
            className={i === points.length - 1 ? styles.yearBarLast : styles.yearBar}
            style={{ height: `${Math.max(1, (p.value / top) * 100)}%` }}
            title={`${p.year}: ${formatValue(p.value)}`}
          >
            <span>{formatValue(p.value)}</span>
          </div>
        ))}
      </div>
      <div className={styles.yearLabels}>
        {points.map((p) => (
          <span key={p.year}>{p.year}</span>
        ))}
      </div>
    </div>
  );
}

/** The last `years` calendar years ending at `lastYear`, zero-filled. */
export function lastYears(
  trend: { year: number; count: number }[],
  years: number,
  lastYear = new Date().getFullYear(),
): YearValue[] {
  const byYear = new Map(trend.map((p) => [p.year, p.count]));
  return Array.from({ length: years }, (_, i) => {
    const year = lastYear - years + 1 + i;
    return { year, value: byYear.get(year) ?? 0 };
  });
}
