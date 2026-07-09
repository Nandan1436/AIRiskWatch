import { useMemo, useState } from "react";
import { useIncidentsQuery } from "./useIncidentQuery";
import { useRiskDomainsQuery } from "../riskDomainHooks/useRiskDomainQuery";
import type { IncidentListParams } from "../../interfaces";

const LIMIT = 20;

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

  const params: IncidentListParams = useMemo(
    () => ({
      limit: LIMIT,
      offset,
      search: filters.search || undefined,
      risk_domain: filters.riskDomain || undefined,
      risk_subdomain: filters.riskSubdomain || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    [filters, offset],
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
