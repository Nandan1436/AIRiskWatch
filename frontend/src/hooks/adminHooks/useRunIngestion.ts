import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runIngestion } from "../../services/adminService";

export function useRunIngestion() {
  const queryClient = useQueryClient();
  const { mutate, data, isPending, error } = useMutation({
    mutationFn: runIngestion,
    // A run can add incidents and reports anywhere in the app.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return {
    run: () => mutate(),
    summary: data ?? null,
    isRunning: isPending,
    error: error ? (error as Error).message : null,
  };
}
