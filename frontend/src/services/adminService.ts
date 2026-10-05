import apiClient from "../api/apiClient";
import type {
  AdminListParams,
  AdminReport,
  AdminReportDetail,
  AdminUserUpdateRequest,
  IncidentDetail,
  IncidentWriteRequest,
  IngestionRunSummary,
  PaginatedResponse,
  ReportWriteRequest,
  User,
} from "../interfaces";

export async function getAdminUsers(params: AdminListParams): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/api/admin/users", { params });
  return data;
}

export async function updateAdminUser(
  userId: number,
  request: AdminUserUpdateRequest,
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/api/admin/users/${userId}`, request);
  return data;
}

export async function runIngestion(): Promise<IngestionRunSummary> {
  const { data } = await apiClient.post<IngestionRunSummary>("/api/ingestion/run");
  return data;
}

export async function createIncident(request: IncidentWriteRequest): Promise<IncidentDetail> {
  const { data } = await apiClient.post<IncidentDetail>("/api/admin/incidents", request);
  return data;
}

export async function updateIncident(
  incidentId: number,
  request: IncidentWriteRequest,
): Promise<IncidentDetail> {
  const { data } = await apiClient.patch<IncidentDetail>(
    `/api/admin/incidents/${incidentId}`,
    request,
  );
  return data;
}

export async function deleteIncident(incidentId: number): Promise<void> {
  await apiClient.delete(`/api/admin/incidents/${incidentId}`);
}

export async function getAdminReports(
  params: AdminListParams,
): Promise<PaginatedResponse<AdminReport>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminReport>>("/api/admin/reports", {
    params,
  });
  return data;
}

export async function getAdminReport(reportNumber: number): Promise<AdminReportDetail> {
  const { data } = await apiClient.get<AdminReportDetail>(`/api/admin/reports/${reportNumber}`);
  return data;
}

export async function createReport(request: ReportWriteRequest): Promise<AdminReportDetail> {
  const { data } = await apiClient.post<AdminReportDetail>("/api/admin/reports", request);
  return data;
}

export async function updateReport(
  reportNumber: number,
  request: ReportWriteRequest,
): Promise<AdminReportDetail> {
  const { data } = await apiClient.patch<AdminReportDetail>(
    `/api/admin/reports/${reportNumber}`,
    request,
  );
  return data;
}

export async function deleteReport(reportNumber: number): Promise<void> {
  await apiClient.delete(`/api/admin/reports/${reportNumber}`);
}
