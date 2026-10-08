import type { Incident } from "../../interfaces";
import { IncidentCard } from "./IncidentCard";
import styles from "./IncidentCard.module.css";

interface IncidentListProps {
  incidents: (Incident & { report_count?: number })[];
  compact?: boolean;
}

export function IncidentList({ incidents, compact }: IncidentListProps) {
  return (
    <div className={styles.list}>
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.incident_id}
          incident={incident}
          compact={compact}
          reportCount={incident.report_count}
        />
      ))}
    </div>
  );
}
