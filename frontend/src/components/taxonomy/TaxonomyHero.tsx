import type { CSSProperties, ReactNode } from "react";
import styles from "./Taxonomy.module.css";

export interface Kpi {
  value: ReactNode;
  label: string;
  tone?: "up" | "down";
}

interface TaxonomyHeroProps {
  color: string;
  tag: ReactNode;
  /** Code shown before the title ("4", "4.3"), or an icon element. */
  marker: ReactNode;
  markerIsIcon?: boolean;
  title: string;
  definition: ReactNode;
  kpis: Kpi[];
  children?: ReactNode;
}

const toneMap = { up: styles.kpiUp, down: styles.kpiDown };

export function TaxonomyHero({
  color,
  tag,
  marker,
  markerIsIcon,
  title,
  definition,
  kpis,
  children,
}: TaxonomyHeroProps) {
  return (
    <section className={styles.hero} style={{ "--c": color } as CSSProperties}>
      <div className="min-w-0">
        <span className={styles.tag}>{tag}</span>
        <h1 className={styles.heroTitle}>
          {markerIsIcon ? marker : <span className={styles.heroNumber}>{marker}</span>}
          {title}
        </h1>
        <p className={styles.definition}>{definition}</p>
        {children}
      </div>
      <div className={styles.kpis}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpi}>
            <b className={kpi.tone ? toneMap[kpi.tone] : undefined}>{kpi.value}</b>
            <span>{kpi.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Other domains: …" style row of related links under the definition. */
export function RelatedRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.chipRow}>
      <span>{label}</span>
      {children}
    </div>
  );
}
