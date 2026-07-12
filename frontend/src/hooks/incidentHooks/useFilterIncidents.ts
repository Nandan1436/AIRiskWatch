import { useMemo, useState } from "react";
import { useIncidentsQuery } from "./useIncidentQuery";
import { useRiskDomainsQuery } from "../riskDomainHooks/useRiskDomainQuery";
import { useDebouncedValue } from "../useDebouncedValue";
import type { IncidentListParams } from "../../interfaces";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export interface IncidentFilterState {
  search: string;
  riskDomain: string;
  riskSubdomain: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: IncidentFilterState = {
  search: "",
  riskDomain: "",
  riskSubdomain: "",
  dateFrom: "",
  dateTo: "",
};

export function useFilterIncidents() {
  const [filters, setFilters] = useState<IncidentFilterState>(INITIAL_FILTERS);
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);

  const params: IncidentListParams = useMemo(
    () => ({
      limit: LIMIT,
      offset,
      search: debouncedSearch || undefined,
      risk_domain: filters.riskDomain || undefined,
      risk_subdomain: filters.riskSubdomain || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    [debouncedSearch, filters.riskDomain, filters.riskSubdomain, filters.dateFrom, filters.dateTo, offset],
  );

  const { incidents, total, isLoading, error } = useIncidentsQuery(params);
  const { riskDomains } = useRiskDomainsQuery();

  function handleFilterChange(next: Partial<IncidentFilterState>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setOffset(0);
  }

  return {
    incidents,
    total,
    limit: LIMIT,
    offset,
    setOffset,
    filters,
    handleFilterChange,
    riskDomains,
    isLoading,
    error,
  };
}
