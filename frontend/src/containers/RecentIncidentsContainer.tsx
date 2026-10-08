import { ArrowRight } from "lucide-react";
import { IncidentList } from "../components/incidents";
import { SectionHead } from "../components/layout";
import { ButtonLink, ErrorMessage, LoadingSpinner } from "../components/ui";
import { useIncidentsQuery } from "../hooks";

const RECENT_COUNT = 5;

export function RecentIncidentsContainer() {
  const { incidents, total, isLoading, error } = useIncidentsQuery({ limit: RECENT_COUNT, offset: 0 });

  return (
    <>
      <SectionHead
        eyebrow="Latest"
        title="Recent incidents"
        actions={
          <ButtonLink to="/incidents" variant="ghost">
            View all {total ? total.toLocaleString() : ""} incidents <ArrowRight />
          </ButtonLink>
        }
      />
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && <IncidentList incidents={incidents} />}
    </>
  );
}
