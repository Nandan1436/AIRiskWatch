import { useParams } from "react-router-dom";
import { useIncidentDetailQuery } from "../hooks/incidentHooks";
import {
  ClassificationBadge,
  ClassificationSidebar,
  SourceReportsList,
} from "../components/incidents";
import { LoadingSpinner, ErrorMessage } from "../components/ui";
import { dedupeClassifications } from "../utils/dedupeClassifications";
import { formatIncidentDate } from "../utils/formatText";

export function IncidentDetailContainer() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { incident, isLoading, error } = useIncidentDetailQuery(
    Number(incidentId),
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!incident) return <ErrorMessage message="Incident not found." />;

  const ref = `#${String(incident.incident_id).padStart(4, "0")}`;
  const classifications = dedupeClassifications(incident.classifications);

  return (
    <div className="grid grid-cols-1 items-start gap-9 md:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-[9px] flex items-center gap-2.5 font-mono text-[11.5px] text-fg-faint">
          <span>INCIDENT {ref}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
          <span>{formatIncidentDate(incident.incident_date)}</span>
        </div>
        <h1 className="mb-4 text-[30px] font-bold leading-[1.2] tracking-tight text-fg">
          {incident.title ?? `Incident #${incident.incident_id}`}
        </h1>

        <div className="mb-[26px] flex flex-wrap gap-[7px]">
          {classifications.map((c, i) => (
            <ClassificationBadge key={i} classification={c} variant="full" />
          ))}
        </div>

        <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[.09em] text-fg-faint">
          Summary
        </div>
        <p className="mb-[34px] max-w-[640px] text-[15.5px] leading-[1.68] text-fg">
          {incident.description ?? "No summary available for this incident."}
        </p>

        <div className="mb-3.5 flex items-baseline gap-2.5">
          <h2 className="text-[17px] font-bold tracking-tight text-fg">
            Source reports
          </h2>
          <span className="font-mono text-[12px] text-fg-faint">
            {incident.reports.length} linked
          </span>
        </div>
        <SourceReportsList reports={incident.reports} />
      </div>

      <ClassificationSidebar classifications={classifications} />
    </div>
  );
}
