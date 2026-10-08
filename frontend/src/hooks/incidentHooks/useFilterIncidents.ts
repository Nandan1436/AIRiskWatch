import { useSearchParams } from "react-router-dom";
import { useIncidentsQuery } from "./useIncidentQuery";
import { useDebouncedValue } from "../useDebouncedValue";
import type { IncidentListParams } from "../../interfaces";
import {
  readFilters,
  readPage,
  toApiFilters,
  type IncidentUrlFilters,
} from "../../utils/incidentFilters";

export const INCIDENT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Current page from `?page=`, and a setter that keeps other params. After a
 * page change it scrolls to the element with `scrollTargetId`, or the top.
 */
export function usePageParam(scrollTargetId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPage(searchParams);

  function setPage(next: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next > 1) params.set("page", String(next));
      else params.delete("page");
      return params;
    });
    const target = scrollTargetId ? document.getElementById(scrollTargetId) : null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { page, offset: (page - 1) * INCIDENT_PAGE_SIZE, setPage };
}

/** Incident list driven by URL filters; any filter change resets to page 1. */
export function useFilterIncidents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { page, offset, setPage } = usePageParam();
  const debouncedQuery = useDebouncedValue(filters.q, SEARCH_DEBOUNCE_MS);

  const params: IncidentListParams = {
    limit: INCIDENT_PAGE_SIZE,
    offset,
    ...toApiFilters({ ...filters, q: debouncedQuery }),
  };
  const { incidents, total, isLoading, isFetching, error } = useIncidentsQuery(params);

  function updateFilters(next: Partial<IncidentUrlFilters>) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(next)) {
          if (value) params.set(key, value);
          else params.delete(key);
        }
        params.delete("page");
        return params;
      },
      // Typing in the search box should not add a history entry per keystroke.
      { replace: "q" in next },
    );
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  return {
    incidents,
    total,
    page,
    offset,
    limit: INCIDENT_PAGE_SIZE,
    setPage,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    isFetching,
    error,
  };
}
