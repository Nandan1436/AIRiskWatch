import apiClient from "../api/apiClient";
import type { RiskDomain } from "../interfaces";

export async function getRiskDomains(): Promise<RiskDomain[]> {
  const { data } = await apiClient.get<RiskDomain[]>("/api/risk-domains/");
  return data;
}
