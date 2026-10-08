import { useParams } from "react-router-dom";
import { useIncidentDetailQuery, useIncidentsQuery } from "../hooks/incidentHooks";
import {
  ClassificationSidebar,
  IncidentDetailHeader,
  IncidentList,
  SourceReportsList,
} from "../components/incidents";
import { SectionHead } from "../components/layout";
import { Card, ErrorMessage, LoadingSpinner } from "../components/ui";
import { dedupeClassifications } from "../utils/dedupeClassifications";
import { findSubdomainByName } from "../utils/taxonomy";

const RELATED_COUNT = 3;

export function IncidentDetailContainer() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { incident, isLoading, error } = useIncidentDetailQuery(Number(incidentId));

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!incident) return <ErrorMessage message="Incident not found." />;

  const classifications = dedupeClassifications(incident.classifications);

  return (
    <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <IncidentDetailHeader incident={incident} />
        <Card>
          <p className="m-0 whitespace-pre-line text-[15px] leading-[1.75] text-fg-dim">
            {incident.description ?? "No summary available for this incident."}
          </p>
        </Card>

        <SectionHead
          title="Source reports"
          actions={<span className="text-[12.5px] text-fg-faint">{incident.reports.length} reports</span>}
          className="mt-8!"
        />
        <SourceReportsList reports={incident.reports} />

        <RelatedIncidents incidentId={incident.incident_id} subdomain={classifications[0]?.risk_subdomain} />
      </div>

      <ClassificationSidebar classifications={classifications} />
    </div>
  );
}

/** Other incidents in the same MIT subdomain. */
function RelatedIncidents({ incidentId, subdomain }: { incidentId: number; subdomain?: string | null }) {
  const match = findSubdomainByName(subdomain);
  const { incidents } = useIncidentsQuery(
    { limit: RELATED_COUNT + 1, offset: 0, risk_subdomain: subdomain ?? undefined },
    Boolean(subdomain),
  );
  const related = incidents.filter((i) => i.incident_id !== incidentId).slice(0, RELATED_COUNT);
  if (!match || related.length === 0) return null;

  return (
    <>
      <SectionHead
        title={`More in ${match.subdomain.code}`}
        description={match.subdomain.name}
        className="mt-8!"
      />
      <IncidentList incidents={related} compact />
    </>
  );
}
