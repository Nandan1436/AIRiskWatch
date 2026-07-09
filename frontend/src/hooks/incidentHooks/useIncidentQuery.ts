import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getIncidentById,
  getIncidents,
  getIncidentTrend,
} from "../../services/incidentService";
import type { IncidentListParams, IncidentTrendParams } from "../../interfaces";

export function useIncidentsQuery(params: IncidentListParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["incidents", params],
    queryFn: () => getIncidents(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    incidents: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
  };
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
    staleTime: 60_000,
  });

  return {
    trend: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
