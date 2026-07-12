import type { Organization } from "../../interfaces";
import { getDomainColor } from "../../utils/domainColor";
import { decodeEntities } from "../../utils/formatText";
import styles from "./RiskDomainBarChart.module.css";

interface OrganizationLeaderboardProps {
  organizations: Organization[];
  totalAttributedIncidents: number;
  unattributedIncidentCount: number;
}

export function OrganizationLeaderboard({
  organizations,
  totalAttributedIncidents,
  unattributedIncidentCount,
}: OrganizationLeaderboardProps) {
  return (
    <div className={styles.card}>
      <div className="mb-0.5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold tracking-tight text-fg">
          Top AI deployers
        </h3>
      </div>
      <p className="mb-5 text-[12.5px] text-fg-dim">
        Organizations most frequently named as the alleged deployer of the
        system involved.
      </p>

      <div className="flex flex-col gap-3.5">
        {organizations.map((org, index) => {
          const color = getDomainColor(org.name);
          const pct = totalAttributedIncidents
            ? Math.round((org.incident_count / totalAttributedIncidents) * 100)
            : 0;
          const width = `${pct}%`;
          return (
            <div key={org.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-[9px]">
                  <span className="font-mono text-[11px] tabular-nums text-fg-faint">
                    {index + 1}
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium text-fg">
                    {decodeEntities(org.name)}
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-baseline gap-[7px] font-mono">
                  <span className="text-[13px] font-bold tabular-nums text-fg">
                    {pct}%
                  </span>
                  <span className="text-[11px] tabular-nums text-fg-faint">
                    {org.incident_count} incidents
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

      {(() => {
        const totalRelevant = totalAttributedIncidents + unattributedIncidentCount;
        if (!totalRelevant) return null;
        const attributedPct = Math.round(
          (totalAttributedIncidents / totalRelevant) * 100,
        );
        const unattributedPct = 100 - attributedPct;
        return (
          <p className="mt-4 text-[11px] text-fg-faint">
            A named deployer was available for {attributedPct}% of incidents
            naming a deployer. The remaining {unattributedPct}% named only
            unidentified or unknown actors and are excluded from this
            ranking.
          </p>
        );
      })()}
    </div>
  );
}
