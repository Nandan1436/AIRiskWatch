import styles from "./Feedback.module.css";

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
