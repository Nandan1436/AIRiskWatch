import apiClient from "../api/apiClient";
import type { DigestMonth, DigestMonthList } from "../interfaces";

export async function getDigestMonths(): Promise<DigestMonthList> {
  const { data } = await apiClient.get<DigestMonthList>("/api/digest/months");
  return data;
}

// yearMonth is "YYYY-MM".
export async function getDigestMonth(yearMonth: string): Promise<DigestMonth> {
  const [year, month] = yearMonth.split("-");
  const { data } = await apiClient.get<DigestMonth>(`/api/digest/${year}/${Number(month)}`);
  return data;
}
