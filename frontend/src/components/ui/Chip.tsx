import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./Chip.module.css";

interface ChipProps {
  color?: string;
  solid?: boolean;
  dot?: boolean;
  to?: string;
  title?: string;
  className?: string;
  children: ReactNode;
}

/** Pill label. Renders a link when `to` is set; leave it unset inside another link. */
export function Chip({ color, solid, dot, to, title, className = "", children }: ChipProps) {
  const cls = `${styles.chip} ${solid ? styles.solid : ""} ${className}`;
  const style = color ? ({ "--c": color } as CSSProperties) : undefined;
  const content = (
    <>
      {dot && <span className={styles.dot} />}
      <span className={styles.truncate}>{children}</span>
    </>
  );
  return to ? (
    <Link to={to} className={cls} style={style} title={title}>
      {content}
    </Link>
  ) : (
    <span className={cls} style={style} title={title}>
      {content}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className={styles.dot} style={{ "--c": color } as CSSProperties} />;
}
