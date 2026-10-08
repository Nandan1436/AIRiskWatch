import { Link, useLocation } from "react-router-dom";
import type { DigestIncident } from "../../interfaces";
import { pluralize } from "../../utils/formatText";
import { findDomainByName } from "../../utils/taxonomy";
import styles from "./Digest.module.css";

/** The month's most-reported incidents, numbered. */
export function DigestHighlights({ highlights }: { highlights: DigestIncident[] }) {
  const location = useLocation();
  return (
    <div>
      {highlights.map((incident, i) => {
        const domain = findDomainByName(incident.classifications.find((c) => c.risk_domain)?.risk_domain);
        return (
          <div key={incident.incident_id} className={styles.highlight}>
            <span className={styles.highlightNumber}>{i + 1}</span>
            <span>
              <Link to={`/incidents/${incident.incident_id}`} state={{ from: location }}>
                <b>{incident.title ?? `Incident #${incident.incident_id}`}</b>
              </Link>
              <span className={styles.highlightMeta}>
                {[domain?.shortName, pluralize(incident.report_count, "report")].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
