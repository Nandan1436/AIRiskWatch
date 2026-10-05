import type { User } from "../../interfaces";
import { Button } from "../ui";
import styles from "./AdminTable.module.css";

interface UsersTableProps {
  users: User[];
  currentUserId: number | undefined;
  pendingUserId: number | null;
  onToggleRole: (user: User) => void;
  onToggleActive: (user: User) => void;
}

export function UsersTable({
  users,
  currentUserId,
  pendingUserId,
  onToggleRole,
  onToggleActive,
}: UsersTableProps) {
  if (users.length === 0) {
    return <div className={`${styles.tableWrap} ${styles.empty}`}>No users found.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Sign-in</th>
            <th>Status</th>
            <th>Joined</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const isPending = pendingUserId === user.id;
            return (
              <tr key={user.id}>
                <td>
                  <div className="font-semibold">
                    {user.username}
                    {isSelf && <span className="ml-2 text-[11px] text-fg-faint">(you)</span>}
                  </div>
                  <div className={styles.dim}>{user.email}</div>
                </td>
                <td>
                  <span className={user.role === "admin" ? styles.pillAccent : styles.pill}>
                    {user.role}
                  </span>
                </td>
                <td className={styles.dim}>
                  {[user.has_password && "Password", user.has_google && "Google"]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td>
                  <span className={user.is_active ? styles.pill : styles.pillAccent}>
                    {user.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className={styles.mono}>{user.created_at.slice(0, 10)}</td>
                <td>
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      disabled={isSelf || isPending}
                      onClick={() => onToggleRole(user)}
                    >
                      {user.role === "admin" ? "Make user" : "Make admin"}
                    </Button>
                    <Button
                      variant={user.is_active ? "danger" : "secondary"}
                      disabled={isSelf || isPending}
                      onClick={() => onToggleActive(user)}
                    >
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
