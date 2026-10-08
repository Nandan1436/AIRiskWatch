import { MIT_CAUSAL, type CausalDimension } from "../../constants/mitTaxonomy";
import type { ClassificationBreakdown } from "../../interfaces";
import { CAUSAL_PARAM, taxonomyPaths } from "../../utils/taxonomy";
import { SplitBar } from "./SplitBar";
import styles from "./Charts.module.css";

// First category solid, second lighter, "Other" neutral (as in the mockups).
const CATEGORY_COLORS = [
  "var(--data)",
  "color-mix(in srgb, var(--data) 60%, var(--surface))",
  "var(--fg-faint)",
];

const HINTS = { entity: "who caused it", intent: "was it intended", timing: "when in the lifecycle" };

interface CausalProfileProps {
  breakdown: ClassificationBreakdown;
  /** Side by side on wide screens instead of stacked. */
  columns?: boolean;
  /** Dimensions to show; defaults to all three. */
  only?: CausalDimension[];
}

/** Entity / intent / timing split bars; every segment links to its category page. */
export function CausalProfile({ breakdown, columns, only }: CausalProfileProps) {
  return (
    <div className={columns ? styles.causalColumns : undefined}>
      {MIT_CAUSAL.filter((d) => !only || only.includes(d.dimension)).map(({ dimension, label, categories }) => {
        const counts = breakdown[CAUSAL_PARAM[dimension]];
        return (
          <SplitBar
            key={dimension}
            title={label}
            hint={HINTS[dimension]}
            segments={categories.map((c, i) => ({
              key: c.slug,
              label: c.name,
              value: counts.find((item) => item.name === c.name)?.incident_count ?? 0,
              color: CATEGORY_COLORS[i],
              to: taxonomyPaths.causal(dimension, c.slug),
            }))}
          />
        );
      })}
    </div>
  );
}
