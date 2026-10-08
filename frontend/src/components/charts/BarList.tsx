import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import styles from "./Charts.module.css";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  color: string;
  to?: string;
}

/** Horizontal bars scaled to the largest value; rows with `to` are links. */
export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={styles.bars}>
      {items.map((item) => {
        const content = (
          <>
            <span className={styles.barName} title={item.label}>
              {item.label}
            </span>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className={styles.barValue}>{item.value.toLocaleString()}</span>
          </>
        );
        const style = { "--c": item.color } as CSSProperties;
        return item.to ? (
          <Link key={item.key} to={item.to} className={styles.barRow} style={style}>
            {content}
          </Link>
        ) : (
          <div key={item.key} className={styles.barRow} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
