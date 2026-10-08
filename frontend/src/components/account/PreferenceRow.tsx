import type { ReactNode } from "react";
import styles from "./Account.module.css";

interface PreferenceRowProps {
  title: string;
  description: string;
  control: ReactNode;
}

export function PreferenceRow({ title, description, control }: PreferenceRowProps) {
  return (
    <div className={styles.pref}>
      <div>
        <b>{title}</b>
        <p>{description}</p>
      </div>
      {control}
    </div>
  );
}
