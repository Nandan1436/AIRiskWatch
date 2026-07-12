import { useState } from "react";
import type { ClassificationBreakdown, ClassificationBreakdownItem } from "../../interfaces";
import { getDomainColor } from "../../utils/domainColor";
import { decodeEntities } from "../../utils/formatText";
import styles from "./RiskDomainBarChart.module.css";

interface ClassificationBreakdownChartProps {
  breakdown: ClassificationBreakdown;
}

type BreakdownField = "causal_entity" | "intent" | "timing";

const TABS: { field: BreakdownField; label: string }[] = [
  { field: "causal_entity", label: "Causal entity" },
  { field: "intent", label: "Intent" },
  { field: "timing", label: "Timing" },
];

function BarListBody({ items }: { items: ClassificationBreakdownItem[] }) {
  const total = items.reduce((sum, i) => sum + i.incident_count, 0);
  const max = Math.max(1, ...items.map((i) => i.incident_count));
  const sorted = [...items].sort((a, b) => b.incident_count - a.incident_count);

  return (
    <div className="flex flex-col gap-3.5">
      {sorted.map((item) => {
        const color = getDomainColor(item.name);
        const width = `${((item.incident_count / max) * 100).toFixed(1)}%`;
        const pct = total
          ? ((item.incident_count / total) * 100).toFixed(1)
          : "0.0";
        return (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-[9px]">
                <span
                  className="h-[9px] w-[9px] flex-shrink-0 rounded-[3px]"
                  style={{ background: color }}
                />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium text-fg">
                  {decodeEntities(item.name)}
                </span>
              </span>
              <span className="flex flex-shrink-0 items-baseline gap-[7px] font-mono">
                <span className="text-[13px] font-bold tabular-nums text-fg">
                  {item.incident_count}
                </span>
                <span className="text-[11px] tabular-nums text-fg-faint">
                  {pct}%
                </span>
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 78%, transparent), ${color})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClassificationBreakdownChart({
  breakdown,
}: ClassificationBreakdownChartProps) {
  const [field, setField] = useState<BreakdownField>("causal_entity");

  return (
    <div className={styles.card}>
      <div className="mb-0.5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold tracking-tight text-fg">
          Incidents by classification
        </h3>
      </div>
      <p className="mb-4 text-[12.5px] text-fg-dim">
        Who or what was involved, and whether harm was intentional.
      </p>

      <div className="mb-5 flex gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.field}
            type="button"
            onClick={() => setField(tab.field)}
            className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
              field === tab.field
                ? "bg-accent text-white"
                : "bg-surface-2 text-fg-dim hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <BarListBody items={breakdown[field]} />
    </div>
  );
}
