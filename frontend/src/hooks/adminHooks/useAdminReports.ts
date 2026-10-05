import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminListParams, AdminReportDetail } from "../../interfaces";
import {
  createReport,
  getAdminReport,
  getAdminReports,
  updateReport,
} from "../../services/adminService";
import {
  ReportFormSchema,
  joinList,
  toReportRequest,
  type ReportForm,
} from "../../utils/adminValidation";
import { useZodForm } from "./useZodForm";

export function useAdminReportsQuery(params: AdminListParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "reports", params],
    queryFn: () => getAdminReports(params),
    placeholderData: keepPreviousData,
  });

  return {
    reports: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useAdminReportQuery(reportNumber: number | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "report-detail", reportNumber],
    queryFn: () => getAdminReport(reportNumber as number),
    enabled: reportNumber !== null,
  });

  return {
    report: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

function toForm(report: AdminReportDetail | null): ReportForm {
  return {
    title: report?.title ?? "",
    text: report?.text ?? "",
    url: report?.url ?? "",
    source_domain: report?.source_domain ?? "",
    authors: report?.authors ?? "",
    published_date: report?.published_date ?? "",
    language: report?.language ?? "en",
    incident_ids: joinList(report?.incident_ids),
  };
}

// Creates a new report when report is null, otherwise edits it.
export function useReportForm(report: AdminReportDetail | null, onSaved: () => void) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (form: ReportForm) =>
      report
        ? updateReport(report.report_number, toReportRequest(form))
        : createReport(toReportRequest(form)),
    onSuccess: () => {
      // Report links also appear on incident detail pages.
      queryClient.invalidateQueries();
      onSaved();
    },
  });
  const form = useZodForm(ReportFormSchema, toForm(report), (data) => mutate(data));

  return {
    ...form,
    generalError: error ? (error as Error).message : null,
    isSubmitting: isPending,
  };
}
