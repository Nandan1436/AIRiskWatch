import apiClient from "../api/apiClient";
import type {
  OrganizationLeaderboardResponse,
  OrganizationParams,
} from "../interfaces";

export async function getTopOrganizations(
  params: OrganizationParams = {},
): Promise<OrganizationLeaderboardResponse> {
  const { data } = await apiClient.get<OrganizationLeaderboardResponse>(
    "/api/organizations/top",
    { params },
  );
  return data;
}
