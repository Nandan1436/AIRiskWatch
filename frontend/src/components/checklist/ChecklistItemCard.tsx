import { Link, useLocation } from "react-router-dom";
import { Check, FileSearch } from "lucide-react";
import type { ChecklistItem, Severity } from "../../utils/riskChecklist";
import { pluralize } from "../../utils/formatText";
import { taxonomyPaths } from "../../utils/taxonomy";
import styles from "./Checklist.module.css";

const severityMap: Record<Severity, string> = {
  high: styles.sevHigh,
  medium: styles.sevMedium,
  low: styles.sevLow,
};

interface ChecklistItemCardProps {
  item: ChecklistItem;
  done: boolean;
  onToggle: () => void;
}

export function ChecklistItemCard({ item, done, onToggle }: ChecklistItemCardProps) {
  const location = useLocation();
  const example = item.matches[0];
  return (
    <div className={done ? styles.itemDone : styles.item}>
      <button
        type="button"
        className={done ? styles.boxOn : styles.box}
        onClick={onToggle}
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark ${item.subdomain.code} as reviewed`}
      >
        {done && <Check />}
      </button>
      <div className="min-w-0">
        <h5>
          {item.subdomain.code} {item.subdomain.name}
        </h5>
        <p>{item.question}</p>
        <div className={styles.evidence}>
          <Link to={taxonomyPaths.subdomain(item.subdomain.code)}>
            <FileSearch />
            {pluralize(item.matches.length, "similar incident")}
          </Link>
          {example && (
            <Link to={`/incidents/${example.incident_id}`} state={{ from: location }} className={styles.example}>
              e.g. “{example.title}”
            </Link>
          )}
        </div>
      </div>
      <span className={severityMap[item.severity]}>{item.severity}</span>
    </div>
  );
}
