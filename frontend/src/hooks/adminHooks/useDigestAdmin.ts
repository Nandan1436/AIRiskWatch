import { useMutation, useQuery } from "@tanstack/react-query";
import { getDigestPreview, getDigestStatus, sendDigest } from "../../services/adminService";

// month is "YYYY-MM".
export function useDigestAdmin(month: string | undefined) {
  const status = useQuery({
    queryKey: ["admin", "digest", "status", month],
    queryFn: () => getDigestStatus(month),
    enabled: Boolean(month),
  });

  const preview = useMutation({
    mutationFn: () => getDigestPreview(month),
    onSuccess: (html) => {
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });

  const send = useMutation({
    mutationFn: (testTo?: string) => sendDigest({ month, test_to: testTo }),
    // The full send runs in the background; refresh the counts shortly after.
    onSuccess: () => setTimeout(() => status.refetch(), 3000),
  });

  const error = status.error ?? preview.error ?? send.error;
  return {
    status: status.data ?? null,
    refreshStatus: () => status.refetch(),
    isRefreshing: status.isFetching,
    preview: () => preview.mutate(),
    isPreviewing: preview.isPending,
    sendTest: (email: string) => send.mutate(email),
    sendAll: () => send.mutate(undefined),
    isSending: send.isPending,
    lastSend: send.data ?? null,
    error: error ? (error as Error).message : null,
  };
}
