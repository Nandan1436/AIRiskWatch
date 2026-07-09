import { useFilterIncidents } from "../hooks/incidentHooks";
import { IncidentCard, IncidentFilters } from "../components/incidents";
import { LoadingSpinner, ErrorMessage, Pagination } from "../components/ui";

export function IncidentListContainer() {
  const {
    incidents,
    total,
    limit,
    offset,
    setOffset,
    isLoading,
    error,
    filters,
    riskDomains,
    handleFilterChange,
  } = useFilterIncidents();

  return (
    <div>
      <IncidentFilters
        filters={filters}
        riskDomains={riskDomains}
        onFilterChange={handleFilterChange}
      />

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!isLoading && !error && (
        <>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[13px] text-fg-dim">
              Showing{" "}
              <span className="font-mono font-semibold text-fg">
                {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-mono font-semibold text-fg">
                {total.toLocaleString()}
              </span>{" "}
              incidents
            </div>
            <div className="text-[12px] text-fg-faint">
              Sorted by date · newest first
            </div>
          </div>

          {incidents.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-fg-dim">
              No incidents match these filters.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {incidents.map((incident) => (
                <IncidentCard key={incident.incident_id} incident={incident} />
              ))}
            </div>
          )}

          {incidents.length > 0 && (
            <Pagination
              offset={offset}
              limit={limit}
              total={total}
              onOffsetChange={setOffset}
            />
          )}
        </>
      )}
    </div>
  );
}
