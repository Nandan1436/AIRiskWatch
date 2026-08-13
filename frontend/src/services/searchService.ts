import apiClient from "../api/apiClient";
import type { SearchRequest, SearchResponse } from "../interfaces";

export async function searchIncidents(
  request: SearchRequest,
): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>(
    "/api/search",
    request,
  );
  return data;
}
