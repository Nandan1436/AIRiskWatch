import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MIT_DOMAINS } from "../../constants/mitTaxonomy";
import type { RiskDomain } from "../../interfaces";
import { formatPercent } from "../../utils/formatText";
import { domainColor, findDomainByName, findSubdomainByName, taxonomyPaths } from "../../utils/taxonomy";
import styles from "./Taxonomy.module.css";

/** MIT domain grid: one row per domain, subdomain cells sized and shaded by incident count. */
export function DomainLandscape({ riskDomains }: { riskDomains: RiskDomain[] }) {
  const domainCounts = new Map(riskDomains.map((d) => [findDomainByName(d.name)?.number, d.incident_count]));
  const subCounts = new Map(
    riskDomains.flatMap((d) => d.subdomains.map((s) => [findSubdomainByName(s.name)?.subdomain.code, s.incident_count])),
  );
  const total = riskDomains.reduce((sum, d) => sum + d.incident_count, 0);

  return (
    <div className={styles.land}>
      {MIT_DOMAINS.map((domain) => {
        const count = domainCounts.get(domain.number) ?? 0;
        const counts = domain.subdomains.map((s) => subCounts.get(s.code) ?? 0);
        const max = Math.max(1, ...counts);
        const many = domain.subdomains.length > 3;
        return (
          <div key={domain.number} className={styles.landRow} style={{ "--c": domainColor(domain) } as CSSProperties}>
            <Link to={taxonomyPaths.domain(domain.number)} className={styles.domainCell}>
              <div>
                <div className={styles.domainName}>
                  <span>{domain.number}</span>
                  {domain.name}
                </div>
                <div className={styles.domainMeta}>
                  {count.toLocaleString()} incidents · {formatPercent(count, total)}
                </div>
              </div>
              <span className={styles.domainGo}>
                Open domain <ArrowRight />
              </span>
            </Link>
            <div className={`${styles.subs} ${many ? styles.subsMany : ""}`}>
              {domain.subdomains.map((sub, i) => (
                <Link
                  key={sub.code}
                  to={taxonomyPaths.subdomain(sub.code)}
                  className={styles.subCell}
                  style={
                    {
                      "--w": many ? 1 : Math.max(counts[i], max * 0.25),
                      "--i": `${12 + Math.round((counts[i] / max) * 30)}%`,
                    } as CSSProperties
                  }
                >
                  <div className={styles.subName}>
                    <b>{sub.code}</b>
                    {sub.name}
                  </div>
                  <div className={styles.subCount}>{counts[i].toLocaleString()} incidents</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
