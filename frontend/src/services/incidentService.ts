import apiClient from "../api/apiClient";
import type {
  Incident,
  IncidentDetail,
  IncidentListParams,
  IncidentTrendParams,
  IncidentTrendPoint,
  PaginatedResponse,
} from "../interfaces";

export async function getIncidents(
  params: IncidentListParams,
): Promise<PaginatedResponse<Incident>> {
  const { data } = await apiClient.get<PaginatedResponse<Incident>>(
    "/api/incidents/",
    { params },
  );
  return data;
}

export async function getIncidentById(
  incidentId: number,
): Promise<IncidentDetail> {
  const { data } = await apiClient.get<IncidentDetail>(
    `/api/incidents/${incidentId}`,
  );
  return data;
}

export async function getIncidentTrend(
  params: IncidentTrendParams,
): Promise<IncidentTrendPoint[]> {
  const { data } = await apiClient.get<{ items: IncidentTrendPoint[] }>(
    "/api/incidents/trend",
    { params },
  );
  return data.items;
}
