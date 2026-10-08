import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getIncidentById,
  getIncidents,
  getIncidentTrend,
} from "../../services/incidentService";
import type { IncidentListParams, IncidentTrendParams } from "../../interfaces";

export function useIncidentsQuery(params: IncidentListParams, enabled = true) {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["incidents", params],
    queryFn: () => getIncidents(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });

  return {
    incidents: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error: error ? (error as Error).message : null,
  };
}

/** Number of incidents matching the filters (fetches a single row). */
export function useIncidentCountQuery(params: Omit<IncidentListParams, "limit" | "offset">) {
  const { data, isLoading } = useQuery({
    queryKey: ["incident-count", params],
    queryFn: () => getIncidents({ ...params, limit: 1, offset: 0 }),
    staleTime: 5 * 60_000,
  });
  return { count: data?.total, isLoading };
}

export function useIncidentDetailQuery(incidentId: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["incident-detail", incidentId],
    queryFn: () => getIncidentById(incidentId),
    enabled: Number.isFinite(incidentId),
    staleTime: 5 * 60_000,
  });

  return {
    incident: data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useIncidentTrendQuery(params: IncidentTrendParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["incident-trend", params],
    queryFn: () => getIncidentTrend(params),
    staleTime: 5 * 60_000,
  });

  return {
    trend: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
