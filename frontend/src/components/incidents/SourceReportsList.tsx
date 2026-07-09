import { useState } from "react";
import type { ReportSummary } from "../../interfaces";
import { formatIncidentDate } from "../../utils/formatText";
import styles from "./SourceReportsList.module.css";

const COLLAPSE_COUNT = 5;

export function SourceReportsList({ reports }: { reports: ReportSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = reports.length > COLLAPSE_COUNT;
  const visible = expanded || !hasMore ? reports : reports.slice(0, COLLAPSE_COUNT);

  if (reports.length === 0) {
    return <p className="text-[13px] text-fg-dim">No linked source reports.</p>;
  }

  return (
    <>
      <div
        className={styles.list}
        style={{
          maxHeight: reports.length > 6 ? "440px" : "none",
          overflowY: "auto",
        }}
      >
        {visible.map((report, i) => (
          <a
            key={report.report_number}
            href={report.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.row}
          >
            <span className="w-7 flex-shrink-0 font-mono text-[11px] text-fg-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium leading-[1.4] text-fg">
                {report.title ?? `Report #${report.report_number}`}
              </span>
              <span className="mt-[3px] flex items-center gap-2 text-[11.5px] text-fg-faint">
                {report.source_domain && (
                  <span className="font-semibold text-link">
                    {report.source_domain}
                  </span>
                )}
                {report.published_date && (
                  <>
                    <span className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
                    <span className="font-mono">
                      {formatIncidentDate(report.published_date)}
                    </span>
                  </>
                )}
              </span>
            </span>
            <svg
              className="flex-shrink-0 text-fg-faint"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer reports" : `Show all ${reports.length} reports`}
        </button>
      )}
    </>
  );
}
