import { useState } from "react";
import { UsersTable } from "../components/admin";
import { ErrorMessage, LoadingSpinner, Pagination, TextField } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAdminUsersQuery, useUpdateUserMutation } from "../hooks/adminHooks";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const PAGE_SIZE = 20;

export function AdminUsersContainer() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { users, total, isLoading, error } = useAdminUsersQuery({
    limit: PAGE_SIZE,
    offset,
    search: debouncedSearch || undefined,
  });
  const { updateUser, pendingUserId, error: updateError } = useUpdateUserMutation();

  return (
    <div>
      <div className="mb-4 max-w-[360px]">
        <TextField
          label="Search users"
          name="user-search"
          placeholder="Email or username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
      </div>
      {updateError && (
        <div className="mb-4">
          <ErrorMessage message={updateError} />
        </div>
      )}
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && (
        <>
          <UsersTable
            users={users}
            currentUserId={currentUser?.id}
            pendingUserId={pendingUserId}
            onToggleRole={(user) =>
              updateUser(user.id, { role: user.role === "admin" ? "user" : "admin" })
            }
            onToggleActive={(user) => updateUser(user.id, { is_active: !user.is_active })}
          />
          <Pagination offset={offset} limit={PAGE_SIZE} total={total} onOffsetChange={setOffset} />
        </>
      )}
    </div>
  );
}
