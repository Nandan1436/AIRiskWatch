import { useMutation } from "@tanstack/react-query";
import { searchIncidents } from "../../services/searchService";
import type { SearchRequest } from "../../interfaces";

export function useSearchIncidents() {
  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: (request: SearchRequest) => searchIncidents(request),
  });

  return {
    search: mutate,
    summary: data?.summary ?? null,
    results: data?.results ?? [],
    isLoading: isPending,
    error: error ? (error as Error).message : null,
    reset,
  };
}
