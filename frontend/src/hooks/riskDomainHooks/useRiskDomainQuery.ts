import { useQuery } from "@tanstack/react-query";
import { getRiskDomains } from "../../services/riskDomainService";

export function useRiskDomainsQuery() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["risk-domains"],
    queryFn: getRiskDomains,
    staleTime: 10 * 60_000,
  });

  return {
    riskDomains: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
