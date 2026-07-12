import { useQuery } from "@tanstack/react-query";
import { getTopOrganizations } from "../../services/organizationService";
import type { OrganizationParams } from "../../interfaces";

export function useOrganizationsQuery(params: OrganizationParams = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizations", params],
    queryFn: () => getTopOrganizations(params),
    staleTime: 10 * 60_000,
  });

  return {
    organizations: data?.organizations ?? [],
    totalAttributedIncidents: data?.total_attributed_incidents ?? 0,
    unattributedIncidentCount: data?.unattributed_incident_count ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
