import type { IngestionRunSummary } from "../../interfaces";
import { Card, StatCard } from "../ui";

const STATUS_COPY: Record<string, string> = {
  completed: "Run completed",
  partial: "Run completed with some errors",
  failed: "Run failed",
  skipped: "Skipped: another ingestion run holds the lock",
};

export function IngestionSummaryCard({ summary }: { summary: IngestionRunSummary }) {
  const stats = [
    { label: "Sources", value: summary.sources_processed },
    { label: "Articles seen", value: summary.articles_seen },
    { label: "Relevant", value: summary.articles_relevant },
    { label: "Incidents created", value: summary.incidents_created },
    { label: "Reports attached", value: summary.reports_attached },
    { label: "Failed", value: summary.articles_failed },
  ];

  return (
    <Card title="Last run" description={STATUS_COPY[summary.status] ?? `Status: ${summary.status}`}>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value.toLocaleString()} />
        ))}
      </div>
      {summary.errors.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.07em] text-fg-faint">
            Errors
          </div>
          <ul className="flex flex-col gap-1 font-mono text-[12px] text-fg-dim">
            {summary.errors.map((error, i) => (
              <li key={i} className="break-words">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
