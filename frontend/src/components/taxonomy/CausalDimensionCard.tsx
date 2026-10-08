import { Link } from "react-router-dom";
import { ChevronRight, Clock, Crosshair, UserRoundCog, type LucideIcon } from "lucide-react";
import type { CausalDimension, CausalDimensionInfo } from "../../constants/mitTaxonomy";
import type { ClassificationBreakdownItem } from "../../interfaces";
import { Card } from "../ui";
import { taxonomyPaths } from "../../utils/taxonomy";
import styles from "./Taxonomy.module.css";

const ICONS: Record<CausalDimension, LucideIcon> = {
  entity: UserRoundCog,
  intent: Crosshair,
  timing: Clock,
};

interface CausalDimensionCardProps {
  info: CausalDimensionInfo;
  counts: ClassificationBreakdownItem[];
}

export function CausalDimensionCard({ info, counts }: CausalDimensionCardProps) {
  const Icon = ICONS[info.dimension];
  const total = counts.reduce((sum, c) => sum + c.incident_count, 0);
  return (
    <Card className={styles.causalCard}>
      <h3>
        <Icon />
        {info.label}
      </h3>
      <div className={styles.causalQuestion}>{info.question}</div>
      {info.categories.map((category) => {
        const count = counts.find((c) => c.name === category.name)?.incident_count ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <Link key={category.slug} to={taxonomyPaths.causal(info.dimension, category.slug)} className={styles.option}>
            <div className={styles.optionHead}>
              {category.name}
              <span>
                {pct}% <ChevronRight />
              </span>
            </div>
            <p>{category.definition}</p>
            <div className={styles.optionTrack}>
              <div style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
