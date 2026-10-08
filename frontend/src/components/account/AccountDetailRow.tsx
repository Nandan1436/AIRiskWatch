import type { ReactNode } from "react";
import styles from "./Account.module.css";

interface AccountDetailRowProps {
  label: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function AccountDetailRow({ label, icon, action, children }: AccountDetailRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.key}>
        {icon}
        {label}
      </span>
      <span className={styles.value}>{children}</span>
      <span className={styles.action}>{action}</span>
    </div>
  );
}
