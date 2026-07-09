import type { ReportSummary } from "./report";

export interface IncidentClassification {
  risk_domain: string | null;
  risk_subdomain: string | null;
  causal_entity: string | null;
  timing: string | null;
  intent: string | null;
}

export interface Incident {
  incident_id: number;
  title: string | null;
  incident_date: string | null;
  alleged_deployer: string[] | null;
  alleged_developer: string[] | null;
  harmed_parties: string[] | null;
  classifications: IncidentClassification[];
}

export interface IncidentDetail extends Incident {
  description: string | null;
  reports: ReportSummary[];
}

export interface IncidentListParams {
  limit: number;
  offset: number;
  search?: string;
  risk_domain?: string;
  risk_subdomain?: string;
  causal_entity?: string;
  timing?: string;
  intent?: string;
  date_from?: string;
  date_to?: string;
}

export interface IncidentTrendParams {
  risk_domain?: string;
  risk_subdomain?: string;
  causal_entity?: string;
  timing?: string;
  intent?: string;
  date_from?: string;
  date_to?: string;
}

export interface IncidentTrendPoint {
  year: number;
  count: number;
}
