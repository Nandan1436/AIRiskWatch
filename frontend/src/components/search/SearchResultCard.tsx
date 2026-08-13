import { Link } from "react-router-dom";
import type { SearchResultItem } from "../../interfaces";
import { getDomainColor, domainBadgeStyle } from "../../utils/domainColor";
import { decodeEntities, formatIncidentDate } from "../../utils/formatText";
import styles from "./SearchResultCard.module.css";

export function SearchResultCard({ result }: { result: SearchResultItem }) {
  const color = getDomainColor(result.risk_domain);
  const style = domainBadgeStyle(color);

  return (
    <Link to={`/incidents/${result.incident_id}`} className={styles.card}>
      <div className="min-w-0 flex-1">
        <div className="mb-[7px] flex items-center gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-fg-faint">
            #{result.incident_id}
          </span>
          <span className="h-[3px] w-[3px] flex-shrink-0 rounded-full bg-fg-faint" />
          <span className="font-mono text-[11px] tabular-nums text-fg-faint">
            {formatIncidentDate(result.incident_date)}
          </span>
        </div>
        <h3 className="mb-[11px] text-[15.5px] font-semibold leading-[1.35] tracking-tight text-fg">
          {result.title ?? `Incident #${result.incident_id}`}
        </h3>
        {result.risk_domain && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full py-[3px] pl-2 pr-2.5 text-[11.5px] font-semibold leading-[1.6]"
            style={{
              background: style.background,
              color: style.color,
              border: style.border,
            }}
          >
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: style.dot }}
            />
            {decodeEntities(result.risk_domain)}
          </span>
        )}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-fg-faint">
        {Math.round(result.similarity * 100)}% match
      </span>
    </Link>
  );
}
