import apiClient from "../api/apiClient";
import type { Summary } from "../interfaces";

export async function getSummary(): Promise<Summary> {
  const { data } = await apiClient.get<Summary>("/api/summary/");
  return data;
}
