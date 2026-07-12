import apiClient from "../api/apiClient";
import type { ClassificationBreakdown } from "../interfaces";

export async function getClassificationBreakdowns(): Promise<ClassificationBreakdown> {
  const { data } = await apiClient.get<ClassificationBreakdown>(
    "/api/classification-breakdowns/",
  );
  return data;
}
