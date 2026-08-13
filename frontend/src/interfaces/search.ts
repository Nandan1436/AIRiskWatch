export interface SearchRequest {
  query: string;
  top_k?: number;
}

export interface SearchResultItem {
  incident_id: number;
  title: string | null;
  incident_date: string | null;
  risk_domain: string | null;
  similarity: number;
}

export interface SearchResponse {
  summary: string;
  results: SearchResultItem[];
}
