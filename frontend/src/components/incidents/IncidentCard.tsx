import { Link } from "react-router-dom";
import type { Incident } from "../../interfaces";
import { dedupeClassifications } from "../../utils/dedupeClassifications";
import { formatIncidentDate } from "../../utils/formatText";
import { ClassificationBadge } from "./ClassificationBadge";
import styles from "./IncidentCard.module.css";

export function IncidentCard({ incident }: { incident: Incident }) {
  const classifications = dedupeClassifications(incident.classifications);
  const primary = classifications[0];
  const metaLine = primary
    ? [
        primary.causal_entity && `${primary.causal_entity}-caused`,
        primary.timing,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <Link to={`/incidents/${incident.incident_id}`} className={styles.card}>
      <div className="min-w-0 flex-1">
        <div className="mb-[7px] flex items-center gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-fg-faint">
            {formatIncidentDate(incident.incident_date)}
          </span>
          {metaLine && (
            <>
              <span className="h-[3px] w-[3px] flex-shrink-0 rounded-full bg-fg-faint" />
              <span className="text-[11px] text-fg-faint">{metaLine}</span>
            </>
          )}
        </div>
        <h3 className="mb-[11px] text-[15.5px] font-semibold leading-[1.35] tracking-tight text-fg">
          {incident.title ?? `Incident #${incident.incident_id}`}
        </h3>
        <div className="flex flex-wrap gap-[7px]">
          {classifications.map((c, i) => (
            <ClassificationBadge key={i} classification={c} />
          ))}
        </div>
      </div>
      <svg
        className="mt-[3px] flex-shrink-0 text-fg-faint"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
