import { LogOut, ShieldCheck } from "lucide-react";
import type { User } from "../../interfaces";
import { Chip } from "../ui";
import styles from "./Account.module.css";

interface AccountProfileCardProps {
  user: User;
  onSignOut: () => void;
}

export function AccountProfileCard({ user, onSignOut }: AccountProfileCardProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className={styles.me}>
        <div className={styles.bigAvatar}>{user.username.charAt(0).toUpperCase()}</div>
        <h2>{user.username}</h2>
        <p>{user.email}</p>
        {user.role === "admin" ? (
          <Chip color="var(--accent)" solid>
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 align-[-3px]" />
            Admin
          </Chip>
        ) : (
          <Chip>Member</Chip>
        )}
      </div>
      <div className={styles.sideNav}>
        <button type="button" onClick={onSignOut}>
          <LogOut />
          Sign out
        </button>
      </div>
    </div>
  );
}
