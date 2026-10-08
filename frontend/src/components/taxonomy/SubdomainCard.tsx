import { Link } from "react-router-dom";
import type { MitSubdomain } from "../../constants/mitTaxonomy";
import { formatPercent } from "../../utils/formatText";
import { taxonomyPaths } from "../../utils/taxonomy";
import styles from "./Taxonomy.module.css";

interface SubdomainCardProps {
  subdomain: MitSubdomain;
  count: number;
  total: number;
  max: number;
}

export function SubdomainCard({ subdomain, count, total, max }: SubdomainCardProps) {
  return (
    <Link to={taxonomyPaths.subdomain(subdomain.code)} className={styles.subCard}>
      <div className="min-w-0">
        <b>
          {subdomain.code} {subdomain.name}
        </b>
        <p>{subdomain.definition}</p>
        <div className={styles.subTrack}>
          <div style={{ width: `${max ? (count / max) * 100 : 0}%` }} />
        </div>
      </div>
      <div className={styles.subCardCount}>
        {count.toLocaleString()}
        <span>{formatPercent(count, total)}</span>
      </div>
    </Link>
  );
}
