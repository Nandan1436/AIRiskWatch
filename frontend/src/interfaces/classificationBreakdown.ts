export interface ClassificationBreakdownItem {
  name: string;
  incident_count: number;
}

export interface ClassificationBreakdown {
  causal_entity: ClassificationBreakdownItem[];
  intent: ClassificationBreakdownItem[];
  timing: ClassificationBreakdownItem[];
  risk_domain: ClassificationBreakdownItem[];
}

/** Taxonomy filters shared by the incident list, trend, breakdown and organization endpoints. */
export interface ClassificationFilters {
  risk_domain?: string;
  risk_subdomain?: string;
  causal_entity?: string;
  timing?: string;
  intent?: string;
}
