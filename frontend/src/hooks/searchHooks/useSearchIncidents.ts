import { useQuery } from "@tanstack/react-query";
import { searchIncidents } from "../../services/searchService";

// The backend caps top_k at 25.
export const SEARCH_TOP_K = 25;

/**
 * Semantic search for `query` (from the URL). Cached per query so returning
 * from an incident page shows the same results without another LLM call.
 */
export function useSearchIncidents(query: string, topK = SEARCH_TOP_K) {
  const trimmed = query.trim();
  const { data, isFetching, error } = useQuery({
    queryKey: ["search", trimmed, topK],
    queryFn: () => searchIncidents({ query: trimmed, top_k: topK }),
    enabled: trimmed.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
  });

  return {
    summary: data?.summary ?? null,
    results: data?.results ?? [],
    hasResults: Boolean(data),
    isLoading: isFetching && !data,
    error: error ? (error as Error).message : null,
  };
}
