import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value.toLocaleString()} />
        ))}
      </div>
      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.07em] text-fg-faint">
          Created incidents
        </div>
        {summary.created_incidents.length === 0 ? (
          <p className="text-[13px] text-fg-dim">No new incidents were created in this run.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[10px] border border-border">
            {summary.created_incidents.map((incident) => (
              <li key={incident.incident_id} className="flex items-start gap-3 px-3 py-2.5 text-[13px]">
                <span className="font-mono text-fg-faint">#{incident.incident_id}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/incidents/${incident.incident_id}`} className="font-medium text-fg hover:text-accent">
                    {incident.title}
                  </Link>
                  <a
                    href={incident.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-fg-dim hover:text-accent"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{incident.url}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
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
