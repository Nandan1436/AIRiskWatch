import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./StatCard.module.css";

export type BadgeTone = "up" | "down" | "neutral";

const toneMap: Record<BadgeTone, string> = {
  up: styles.toneUp,
  down: styles.toneDown,
  neutral: styles.toneNeutral,
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Long values (a domain name) render smaller than numbers. */
  valueIsText?: boolean;
  icon?: ReactNode;
  color?: string;
  badge?: { text: string; tone: BadgeTone } | null;
  sub?: ReactNode;
  chart?: ReactNode;
  to?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  valueIsText,
  icon,
  color = "var(--accent)",
  badge,
  sub,
  chart,
  to,
  children,
}: StatCardProps) {
  const body = (
    <>
      <div className={styles.head}>
        <div className={styles.label}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {label}
        </div>
        {badge && <span className={`${styles.badge} ${toneMap[badge.tone]}`}>{badge.text}</span>}
      </div>
      <div className={valueIsText ? styles.valueText : styles.value}>{value}</div>
      {children}
      {(sub || chart) && (
        <div className={styles.foot}>
          <div className={styles.sub}>{sub}</div>
          {chart}
        </div>
      )}
    </>
  );
  const style = { "--c": color } as CSSProperties;
  return to ? (
    <Link to={to} className={styles.stat} style={style}>
      {body}
    </Link>
  ) : (
    <div className={styles.stat} style={style}>
      {body}
    </div>
  );
}
