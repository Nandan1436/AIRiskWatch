export interface RiskSubdomain {
  name: string;
  incident_count: number;
}

export interface RiskDomain {
  name: string;
  incident_count: number;
  subdomains: RiskSubdomain[];
}
