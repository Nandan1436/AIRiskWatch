import type { Incident } from "./incident";

export interface DigestMonthSummary {
  month: string; // first day of the month, YYYY-MM-DD
  total: number;
}

export interface DigestMonthList {
  items: DigestMonthSummary[]; // newest first
}

export interface DigestDomainCount {
  risk_domain: string;
  count: number;
}

export interface DigestIncident extends Incident {
  description: string | null;
  digest_date: string; // earliest report date, or incident_date without reports
  report_count: number;
}

export interface DigestMonth {
  month: string;
  total: number;
  previous_total: number;
  domain_counts: DigestDomainCount[];
  highlights: DigestIncident[];
  incidents: DigestIncident[];
}

export interface DigestSendRequest {
  month?: string; // YYYY-MM
  test_to?: string;
}

export interface DigestSendResponse {
  month: string;
  test_to: string | null;
}

export interface DigestDeliveryStatus {
  month: string;
  subscribers: number;
  sent: number;
  failed: number;
  pending: number;
}
