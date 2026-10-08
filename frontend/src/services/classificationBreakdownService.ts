import apiClient from "../api/apiClient";
import type { ClassificationBreakdown, ClassificationFilters } from "../interfaces";

export async function getClassificationBreakdowns(
  params: ClassificationFilters = {},
): Promise<ClassificationBreakdown> {
  const { data } = await apiClient.get<ClassificationBreakdown>(
    "/api/classification-breakdowns/",
    { params },
  );
  return data;
}
