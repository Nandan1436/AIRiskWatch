import { Building2, Calendar, Cpu, Users } from "lucide-react";
import type { IncidentDetail } from "../../interfaces";
import { Chip } from "../ui";
import { formatIncidentDate, formatOrgName, isNamedOrg } from "../../utils/formatText";
import { domainColor, findDomainByName, taxonomyPaths } from "../../utils/taxonomy";
import styles from "./IncidentDetailHeader.module.css";

function orgList(values: string[] | null): string | null {
  const named = (values ?? []).filter(isNamedOrg).map(formatOrgName);
  return named.length ? named.join(", ") : null;
}

export function IncidentDetailHeader({ incident }: { incident: IncidentDetail }) {
  const domains = [
    ...new Map(
      incident.classifications
        .map((c) => findDomainByName(c.risk_domain))
        .filter((d) => d !== undefined)
        .map((d) => [d.number, d]),
    ).values(),
  ];
  const deployer = orgList(incident.alleged_deployer);
  const developer = orgList(incident.alleged_developer);
  const harmed = orgList(incident.harmed_parties);

  return (
    <>
      <div className={styles.chips}>
        <Chip className="font-mono">#{incident.incident_id}</Chip>
        {domains.map((d) => (
          <Chip key={d.number} to={taxonomyPaths.domain(d.number)} color={domainColor(d)} solid dot>
            {d.name}
          </Chip>
        ))}
      </div>
      <h1 className={styles.title}>{incident.title ?? `Incident #${incident.incident_id}`}</h1>
      <div className={styles.facts}>
        <span>
          <Calendar />
          {formatIncidentDate(incident.incident_date)}
        </span>
        {deployer && (
          <span>
            <Building2 />
            Deployer: {deployer}
          </span>
        )}
        {developer && (
          <span>
            <Cpu />
            Developer: {developer}
          </span>
        )}
        {harmed && (
          <span>
            <Users />
            Harmed: {harmed}
          </span>
        )}
      </div>
    </>
  );
}
