import { PageHead } from "../components/layout";
import { IncidentListContainer } from "../containers";

export function IncidentList() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHead
        crumbs={[{ label: "Home", to: "/" }, { label: "Incidents" }]}
        eyebrow="Incident database"
        title="All incidents"
        description="Every AI incident in AIRiskWatch, from the MIT seed corpus and daily news ingestion. Filter by taxonomy, cause, date or keyword."
      />
      <IncidentListContainer />
    </div>
  );
}
