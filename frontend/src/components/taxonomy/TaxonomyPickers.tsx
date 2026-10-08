import type { ReactNode } from "react";
import { GitFork, LayoutGrid, Plus } from "lucide-react";
import styles from "./Taxonomy.module.css";

interface TaxonomyPickersProps {
  domainCount: number;
  subdomainCount: number;
  incidentCount: number;
}

/** The taxonomy cards at the top of the Taxonomy page; more can be added later. */
export function TaxonomyPickers({ domainCount, subdomainCount, incidentCount }: TaxonomyPickersProps) {
  return (
    <div className={styles.pickers}>
      <a href="#domain" className={styles.picker}>
        <span className={styles.pickerIcon}>
          <LayoutGrid />
        </span>
        <div>
          <h3>MIT Domain taxonomy</h3>
          <p>
            <em>What kind</em> of harm occurred.
          </p>
          <div className={styles.pickerMeta}>
            {domainCount} domains · {subdomainCount} subdomains · {incidentCount.toLocaleString()} incidents
          </div>
        </div>
      </a>
      <a href="#causal" className={styles.picker}>
        <span className={styles.pickerIconData}>
          <GitFork />
        </span>
        <div>
          <h3>MIT Causal taxonomy</h3>
          <p>
            <em>How</em> the harm came about.
          </p>
          <div className={styles.pickerMeta}>3 dimensions · 9 categories</div>
        </div>
      </a>
      <div className={styles.pickerSoon}>
        <span className={styles.pickerIconMuted}>
          <Plus />
        </span>
        <div>
          <h3>
            More taxonomies <span className={styles.badgeSoon}>Planned</span>
          </h3>
          <p>Actor, lifecycle and sector taxonomies can be added here later.</p>
        </div>
      </div>
    </div>
  );
}

export function LandscapeLegend() {
  return (
    <div className={styles.legend}>
      <span>Click a domain or subdomain to open its page. Width and shade = incidents.</span>
      <span className={styles.scale}>
        fewer <i /> more
      </span>
    </div>
  );
}

export function CausalGrid({ children }: { children: ReactNode }) {
  return <div className={styles.causalGrid}>{children}</div>;
}
