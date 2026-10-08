import { Check } from "lucide-react";
import { Dot, SegmentedControl } from "../ui";
import styles from "./Search.module.css";

export interface FacetOption {
  key: string;
  label: string;
  count: number;
  color?: string;
}

export type MinScore = "any" | "0.5" | "0.7";

const MIN_SCORE_OPTIONS: { value: MinScore; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "0.5", label: "0.5+" },
  { value: "0.7", label: "0.7+" },
];

interface SearchFacetsProps {
  domains: FacetOption[];
  years: FacetOption[];
  selectedDomains: string[];
  selectedYears: string[];
  minScore: MinScore;
  onToggleDomain: (key: string) => void;
  onToggleYear: (key: string) => void;
  onMinScoreChange: (value: MinScore) => void;
}

export function SearchFacets(props: SearchFacetsProps) {
  return (
    <aside className={styles.facets}>
      <h4>Risk domain</h4>
      <FacetGroup options={props.domains} selected={props.selectedDomains} onToggle={props.onToggleDomain} />
      <h4>Year</h4>
      <FacetGroup options={props.years} selected={props.selectedYears} onToggle={props.onToggleYear} />
      <h4>Minimum similarity</h4>
      <SegmentedControl
        label="Minimum similarity"
        options={MIN_SCORE_OPTIONS}
        value={props.minScore}
        onChange={props.onMinScoreChange}
      />
    </aside>
  );
}

function FacetGroup({
  options,
  selected,
  onToggle,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className={styles.facetGroup}>
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <label key={o.key} className={styles.facet}>
            <input type="checkbox" checked={on} onChange={() => onToggle(o.key)} />
            <span className={on ? styles.checkOn : styles.check}>{on && <Check />}</span>
            {o.color && <Dot color={o.color} />}
            <span className={styles.facetLabel}>{o.label}</span>
            <b>{o.count}</b>
          </label>
        );
      })}
    </div>
  );
}
