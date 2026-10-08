import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
  noun?: string;
}

/** First, last, and the current page's neighbours, with gaps in between. */
function pageWindow(page: number, last: number): (number | "gap")[] {
  const items: (number | "gap")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - page) <= 1) items.push(p);
    else if (items[items.length - 1] !== "gap") items.push("gap");
  }
  return items;
}

export function Pagination({ offset, limit, total, onOffsetChange, noun = "incidents" }: PaginationProps) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const last = Math.max(1, Math.ceil(total / limit));
  const from = offset + 1;
  const to = Math.min(total, offset + limit);
  const goTo = (p: number) => onOffsetChange((p - 1) * limit);

  return (
    <nav className={styles.pager} aria-label="Pagination">
      <span>
        Showing <b>{from.toLocaleString()}–{to.toLocaleString()}</b> of <b>{total.toLocaleString()}</b>{" "}
        {noun}
      </span>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.page}
          disabled={page === 1}
          onClick={() => goTo(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>
        {pageWindow(page, last).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className={styles.gap}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? styles.pageActive : styles.page}
              aria-current={p === page ? "page" : undefined}
              onClick={() => goTo(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={styles.page}
          disabled={page === last}
          onClick={() => goTo(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </div>
    </nav>
  );
}
