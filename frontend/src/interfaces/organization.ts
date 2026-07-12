export interface Organization {
  name: string;
  incident_count: number;
}

export interface OrganizationLeaderboardResponse {
  organizations: Organization[];
  total_attributed_incidents: number;
  unattributed_incident_count: number;
}

export interface OrganizationParams {
  limit?: number;
}
