export interface SearchRequest {
  query: string;
  top_k?: number;
}

export interface SearchResultItem {
  incident_id: number;
  title: string | null;
  incident_date: string | null;
  risk_domain: string | null;
  risk_subdomain: string | null;
}

export interface SearchResponse {
  summary: string | null; // null when the AI summary could not be generated
  results: SearchResultItem[];
}
