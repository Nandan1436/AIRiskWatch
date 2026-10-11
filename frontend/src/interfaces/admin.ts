import type { ReportSummary } from "./report";
import type { UserRole } from "./user";

export interface AdminListParams {
  limit: number;
  offset: number;
  search?: string;
}

export interface AdminUserUpdateRequest {
  role?: UserRole;
  is_active?: boolean;
}

export interface IncidentWriteRequest {
  title: string;
  description: string | null;
  incident_date: string | null;
  alleged_deployer: string[];
  alleged_developer: string[];
  harmed_parties: string[];
}

export interface AdminReport extends ReportSummary {
  authors: string | null;
  incident_ids: number[];
}

export interface AdminReportDetail extends AdminReport {
  text: string | null;
}

export interface ReportWriteRequest {
  title: string;
  text: string | null;
  url: string | null;
  source_domain: string | null;
  authors: string | null;
  published_date: string | null;
  language: string | null;
  incident_ids: number[];
}

export interface CreatedIncident {
  incident_id: number;
  title: string;
  url: string;
}

export interface IngestionRunSummary {
  status: string;
  sources_processed: number;
  articles_seen: number;
  articles_relevant: number;
  articles_failed: number;
  incidents_created: number;
  reports_attached: number;
  created_incidents: CreatedIncident[];
  errors: string[];
}
