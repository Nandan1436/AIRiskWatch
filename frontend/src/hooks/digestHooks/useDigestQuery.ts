import { useQuery } from "@tanstack/react-query";
import { getDigestMonth, getDigestMonths } from "../../services/digestService";

export function useDigestMonths() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["digest", "months"],
    queryFn: getDigestMonths,
    staleTime: 10 * 60_000,
  });

  return {
    months: data?.items ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

// yearMonth is "YYYY-MM"; the query waits until it is known.
export function useDigestMonth(yearMonth: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["digest", yearMonth],
    queryFn: () => getDigestMonth(yearMonth!),
    enabled: Boolean(yearMonth),
    staleTime: 10 * 60_000,
  });

  return {
    digest: data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
