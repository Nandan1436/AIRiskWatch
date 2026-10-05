import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteIncident, deleteReport } from "../../services/adminService";

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: deleteIncident,
    onSuccess: (_result, incidentId) => {
      queryClient.removeQueries({ queryKey: ["incident-detail", incidentId] });
      queryClient.invalidateQueries();
    },
  });

  return {
    deleteIncident: (incidentId: number) => mutate(incidentId),
    isDeleting: isPending,
    error: error ? (error as Error).message : null,
  };
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return {
    deleteReport: (reportNumber: number) => mutate(reportNumber),
    isDeleting: isPending,
    error: error ? (error as Error).message : null,
  };
}
