import { useQuery } from "@tanstack/react-query";
import { getSummary } from "../../services/summaryService";

export function useSummaryQuery() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
    staleTime: 10 * 60_000,
  });

  return {
    summary: data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
