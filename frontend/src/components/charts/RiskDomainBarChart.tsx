import type { RiskDomain } from "../../interfaces";
import { getDomainColor } from "../../utils/domainColor";
import { decodeEntities } from "../../utils/formatText";
import styles from "./RiskDomainBarChart.module.css";

interface RiskDomainBarChartProps {
  riskDomains: RiskDomain[];
}

export function RiskDomainBarChart({ riskDomains }: RiskDomainBarChartProps) {
  const total = riskDomains.reduce((sum, d) => sum + d.incident_count, 0);
  const max = Math.max(1, ...riskDomains.map((d) => d.incident_count));
  const sorted = [...riskDomains].sort(
    (a, b) => b.incident_count - a.incident_count,
  );

  return (
    <div className={styles.card}>
      <div className="mb-0.5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold tracking-tight text-fg">
          Incidents by risk domain
        </h3>
        <span className="font-mono text-[11px] text-fg-faint">
          n = {total.toLocaleString()} classified
        </span>
      </div>
      <p className="mb-5 text-[12.5px] text-fg-dim">
        Where oversight attention concentrates across the taxonomy.
      </p>

      <div className="flex flex-col gap-3.5">
        {sorted.map((d) => {
          const color = getDomainColor(d.name);
          const width = `${((d.incident_count / max) * 100).toFixed(1)}%`;
          const pct = total ? ((d.incident_count / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={d.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-[9px]">
                  <span
                    className="h-[9px] w-[9px] flex-shrink-0 rounded-[3px]"
                    style={{ background: color }}
                  />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium text-fg">
                    {decodeEntities(d.name)}
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-baseline gap-[7px] font-mono">
                  <span className="text-[13px] font-bold tabular-nums text-fg">
                    {d.incident_count}
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
    </div>
  );
}
