import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  /**
   * Scroll the body instead of growing. Beside another card in a grid row,
   * the card matches its neighbour's height; use it on one card per row.
   */
  scroll?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  padded = true,
  scroll,
  className = "",
  children,
}: CardProps) {
  const hasHead = Boolean(title || description || actions);
  const bodyClass = scroll ? styles.scrollBody : hasHead ? styles.body : undefined;
  const cardClass = [styles.card, padded && styles.padded, scroll && styles.scroll, className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={cardClass}>
      {hasHead && (
        <div className={styles.head}>
          <div className="min-w-0">
            {title && <h3 className={styles.title}>{title}</h3>}
            {description && <div className={styles.description}>{description}</div>}
          </div>
          {actions}
        </div>
      )}
      {children && <div className={bodyClass}>{children}</div>}
    </section>
  );
}
