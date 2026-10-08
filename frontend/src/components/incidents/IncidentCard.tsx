import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Calendar, ChevronRight, Newspaper } from "lucide-react";
import type { Incident } from "../../interfaces";
import { Chip } from "../ui";
import { firstNamedOrg, formatIncidentDate, pluralize } from "../../utils/formatText";
import { domainColor, findDomainByName } from "../../utils/taxonomy";
import styles from "./IncidentCard.module.css";

interface IncidentCardProps {
  incident: Incident;
  compact?: boolean;
  reportCount?: number;
}

/** One incident row: domain colour bar, title, and a meta line. */
export function IncidentCard({ incident, compact, reportCount }: IncidentCardProps) {
  // Passing the current location lets the detail page link back to the same
  // list page, filters included.
  const location = useLocation();
  const domain = findDomainByName(incident.classifications.find((c) => c.risk_domain)?.risk_domain);
  const org = firstNamedOrg(incident.alleged_deployer) ?? firstNamedOrg(incident.alleged_developer);

  return (
    <Link
      to={`/incidents/${incident.incident_id}`}
      state={{ from: location }}
      className={compact ? styles.rowCompact : styles.row}
      style={{ "--c": domainColor(domain) } as CSSProperties}
    >
      <span className={styles.bar} />
      <div className="min-w-0">
        <h4 className={styles.title}>{incident.title ?? `Incident #${incident.incident_id}`}</h4>
        <div className={styles.meta}>
          {domain && (
            <Chip color={domainColor(domain)} dot>
              {domain.shortName}
            </Chip>
          )}
          <span className={styles.metaItem}>
            <Calendar />
            {formatIncidentDate(incident.incident_date)}
          </span>
          {org && (
            <span className={styles.metaItem}>
              <Building2 />
              {org}
            </span>
          )}
          {reportCount !== undefined && reportCount > 0 && (
            <span className={styles.metaItem}>
              <Newspaper />
              {pluralize(reportCount, "report")}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className={styles.go} />
    </Link>
  );
}
