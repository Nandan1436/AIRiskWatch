import { useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import type { ReportSummary } from "../../interfaces";
import { Button, EmptyState } from "../ui";
import { formatIncidentDate } from "../../utils/formatText";
import styles from "./SourceReportsList.module.css";

const COLLAPSE_COUNT = 5;

export function SourceReportsList({ reports }: { reports: ReportSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reports : reports.slice(0, COLLAPSE_COUNT);

  if (reports.length === 0) {
    return <EmptyState>No linked source reports.</EmptyState>;
  }

  return (
    <div className={styles.list}>
      {visible.map((report) => {
        const meta = [report.source_domain, report.published_date && formatIncidentDate(report.published_date)]
          .filter(Boolean)
          .join(" · ");
        const body = (
          <>
            <span className={styles.icon}>
              <Newspaper />
            </span>
            <div className="min-w-0">
              <h5 className={styles.title}>{report.title ?? `Report #${report.report_number}`}</h5>
              {meta && <div className={styles.meta}>{meta}</div>}
            </div>
            {report.url && <ExternalLink className={styles.external} />}
          </>
        );
        return report.url ? (
          <a key={report.report_number} href={report.url} target="_blank" rel="noopener noreferrer" className={styles.row}>
            {body}
          </a>
        ) : (
          <div key={report.report_number} className={styles.row}>
            {body}
          </div>
        );
      })}
      {reports.length > COLLAPSE_COUNT && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show fewer" : `Show all ${reports.length} reports`}
        </Button>
      )}
    </div>
  );
}
