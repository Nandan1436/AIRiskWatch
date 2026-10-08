import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./Charts.module.css";

export interface SplitSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  to?: string;
}

// Segments narrower than this share stay unlabelled (the tooltip still names them).
const LABEL_MIN_SHARE = 0.12;

interface SplitBarProps {
  title: ReactNode;
  hint?: ReactNode;
  segments: SplitSegment[];
}

/** 100% stacked bar, one segment per category, each optionally a link. */
export function SplitBar({ title, hint, segments }: SplitBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <div className={styles.splitHead}>
        {title}
        {hint && <span>{hint}</span>}
      </div>
      <div className={styles.split}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const share = s.value / total;
            const pct = `${Math.round(share * 100)}%`;
            const style = { flex: s.value, "--c": s.color } as CSSProperties;
            const title = `${s.label}: ${pct} (${s.value.toLocaleString()})`;
            const text = share >= LABEL_MIN_SHARE ? `${s.label} ${pct}` : null;
            return s.to ? (
              <Link key={s.key} to={s.to} className={styles.segment} style={style} title={title}>
                {text}
              </Link>
            ) : (
              <div key={s.key} className={styles.segment} style={style} title={title}>
                {text}
              </div>
            );
          })}
      </div>
    </div>
  );
}
