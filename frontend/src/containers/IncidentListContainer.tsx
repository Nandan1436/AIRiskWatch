import { useFilterIncidents } from "../hooks/incidentHooks";
import { IncidentFilters, IncidentList } from "../components/incidents";
import { EmptyState, ErrorMessage, LoadingSpinner, Pagination } from "../components/ui";

export function IncidentListContainer() {
  const {
    incidents,
    total,
    offset,
    limit,
    setPage,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    isFetching,
    error,
  } = useFilterIncidents();

  return (
    <div>
      <IncidentFilters filters={filters} onChange={updateFilters} onClear={clearFilters} />

      <div className="mb-3 mt-4 flex items-center justify-between gap-3 text-[13px] text-fg-dim">
        <span>
          <b className="text-fg">{isLoading ? "…" : total.toLocaleString()}</b> incidents match
          {isFetching && !isLoading && <span className="ml-2 text-fg-faint">Updating…</span>}
        </span>
        <span className="text-[12px] text-fg-faint">Newest first</span>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && incidents.length === 0 && (
        <EmptyState>No incidents match these filters.</EmptyState>
      )}
      {!isLoading && !error && incidents.length > 0 && (
        <>
          <IncidentList incidents={incidents} />
          <Pagination
            offset={offset}
            limit={limit}
            total={total}
            onOffsetChange={(next) => setPage(next / limit + 1)}
          />
        </>
      )}
    </div>
  );
}
