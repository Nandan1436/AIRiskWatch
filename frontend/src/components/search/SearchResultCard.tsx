import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar } from "lucide-react";
import type { SearchResultItem } from "../../interfaces";
import { Chip } from "../ui";
import { formatIncidentDate } from "../../utils/formatText";
import { domainColor, findDomainByName, findSubdomainByName } from "../../utils/taxonomy";
import styles from "./Search.module.css";

export function SearchResultCard({ result }: { result: SearchResultItem }) {
  const location = useLocation();
  const domain = findDomainByName(result.risk_domain);
  const sub = findSubdomainByName(result.risk_subdomain)?.subdomain;
  const score = Math.max(0, Math.min(1, result.similarity));

  return (
    <Link
      to={`/incidents/${result.incident_id}`}
      state={{ from: location }}
      className={styles.result}
      style={{ "--c": domainColor(domain) } as CSSProperties}
    >
      <span className={styles.resultBar} />
      <div className="min-w-0">
        <h4>{result.title ?? `Incident #${result.incident_id}`}</h4>
        <div className={styles.resultMeta}>
          {domain && (
            <Chip color={domainColor(domain)} dot>
              {domain.shortName}
            </Chip>
          )}
          {sub && <span>{sub.code} {sub.name}</span>}
          <span className={styles.resultDate}>
            <Calendar />
            {formatIncidentDate(result.incident_date)}
          </span>
        </div>
      </div>
      <div className={styles.score}>
        <b>{score.toFixed(2)}</b>
        <span>similarity</span>
        <div className={styles.meter}>
          <div style={{ width: `${score * 100}%` }} />
        </div>
      </div>
    </Link>
  );
}
