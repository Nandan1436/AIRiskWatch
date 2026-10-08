import type { Organization } from "../../interfaces";
import { EmptyState } from "../ui";
import { formatOrgName } from "../../utils/formatText";
import styles from "./Charts.module.css";

function initials(name: string): string {
  const words = name.split(" ").filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

interface OrganizationListProps {
  organizations: Organization[];
  unattributed?: number;
}

export function OrganizationList({ organizations, unattributed }: OrganizationListProps) {
  if (organizations.length === 0 && !unattributed) {
    return <EmptyState>No organizations are named for these incidents.</EmptyState>;
  }
  return (
    <div>
      {organizations.map((org) => {
        const name = formatOrgName(org.name);
        return (
          <div key={org.name} className={styles.org}>
            <span className={styles.orgAvatar}>{initials(name)}</span>
            {name}
            <b>{org.incident_count.toLocaleString()}</b>
          </div>
        );
      })}
      {!!unattributed && (
        <div className={styles.org}>
          <span className={styles.orgAvatar}>?</span>
          Unknown / unattributed
          <b>{unattributed.toLocaleString()}</b>
        </div>
      )}
    </div>
  );
}
