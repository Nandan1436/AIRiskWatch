import { useQuery } from "@tanstack/react-query";
import { getClassificationBreakdowns } from "../../services/classificationBreakdownService";

export function useClassificationBreakdownQuery() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["classification-breakdowns"],
    queryFn: getClassificationBreakdowns,
    staleTime: 10 * 60_000,
  });

  return {
    breakdown: data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
