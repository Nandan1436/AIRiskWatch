import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { AdminListParams, AdminUserUpdateRequest } from "../../interfaces";
import { getAdminUsers, updateAdminUser } from "../../services/adminService";

export function useAdminUsersQuery(params: AdminListParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => getAdminUsers(params),
    placeholderData: keepPreviousData,
  });

  return {
    users: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const { user: currentUser, updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending, variables } = useMutation({
    mutationFn: ({ userId, request }: { userId: number; request: AdminUserUpdateRequest }) =>
      updateAdminUser(userId, request),
    onSuccess: (updated) => {
      setError(null);
      if (updated.id === currentUser?.id) updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return {
    updateUser: (userId: number, request: AdminUserUpdateRequest) => mutate({ userId, request }),
    pendingUserId: isPending ? (variables?.userId ?? null) : null,
    error,
  };
}
