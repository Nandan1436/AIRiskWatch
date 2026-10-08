import styles from "./Feedback.module.css";

export function LoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} />
      {label}
    </div>
  );
}
