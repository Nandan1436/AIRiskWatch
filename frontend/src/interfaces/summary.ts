export interface Summary {
  total_incidents: number;
  total_organizations: number;
  total_risk_domains: number;
  latest_year: number | null;
  latest_year_count: number;
  previous_year_count: number;
  yoy_change_pct: number | null;
}
