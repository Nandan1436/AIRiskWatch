import { NavLink } from "react-router-dom";
import type { DigestMonthSummary } from "../../interfaces";
import { formatDigestMonth, toYearMonth } from "../../utils/digestMonth";
import styles from "./Digest.module.css";

export function DigestMonthTabs({ months }: { months: DigestMonthSummary[] }) {
  return (
    <nav className={styles.months} aria-label="Digest months">
      {months.map((m) => {
        const ym = toYearMonth(m.month);
        const inProgress = m.in_progress;
        return (
          <NavLink
            key={ym}
            to={`/digest/${ym}`}
            className={({ isActive }) => (isActive ? styles.monthActive : styles.month)}
          >
            <b>{formatDigestMonth(m.month, "short")}</b>
            <span>
              {m.total} {inProgress ? "so far · in progress" : m.total === 1 ? "incident" : "incidents"}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
