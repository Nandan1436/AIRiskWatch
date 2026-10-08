import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import styles from "./Search.module.css";

/** The LLM summary, with its [#123] citations turned into incident links. */
export function SearchSummary({ summary }: { summary: string }) {
  const location = useLocation();
  const parts = summary.split(/(\[#\d+\])/g);
  return (
    <div className={styles.summary}>
      <div className={styles.summaryHead}>
        <Sparkles />
        AI summary of the top results
      </div>
      <p>
        {parts.map((part, i) => {
          const id = part.match(/^\[#(\d+)\]$/)?.[1];
          return id ? (
            <Link key={i} to={`/incidents/${id}`} state={{ from: location }}>
              #{id}
            </Link>
          ) : (
            part
          );
        })}
      </p>
    </div>
  );
}
