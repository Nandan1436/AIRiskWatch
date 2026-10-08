import { useQuery } from "@tanstack/react-query";
import { getClassificationBreakdowns } from "../../services/classificationBreakdownService";
import type { ClassificationFilters } from "../../interfaces";

export function useClassificationBreakdownQuery(params: ClassificationFilters = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["classification-breakdowns", params],
    queryFn: () => getClassificationBreakdowns(params),
    staleTime: 10 * 60_000,
  });

  return {
    breakdown: data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
