import type { ReactNode } from "react";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import styles from "./Layout.module.css";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight />}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <b>{item.label}</b>}
        </Fragment>
      ))}
    </nav>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.eyebrow} ${className}`}>{children}</div>;
}

interface PageHeadProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
}

export function PageHead({ eyebrow, title, description, actions, crumbs }: PageHeadProps) {
  return (
    <>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <section className={styles.pageHead}>
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.pageActions}>{actions}</div>}
      </section>
    </>
  );
}

interface SectionHeadProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
}

export function SectionHead({ eyebrow, title, description, actions, id, className = "" }: SectionHeadProps) {
  return (
    <div className={`${styles.secHead} ${className}`} id={id}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className={styles.secActions}>{actions}</div>}
    </div>
  );
}
