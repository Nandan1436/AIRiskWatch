import apiClient from "../api/apiClient";
import type { User, UserUpdateRequest } from "../interfaces";

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/api/users/me");
  return data;
}

export async function updateCurrentUser(request: UserUpdateRequest): Promise<User> {
  const { data } = await apiClient.patch<User>("/api/users/me", request);
  return data;
}
