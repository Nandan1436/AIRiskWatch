import styles from "./Account.module.css";

interface UsernameInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function UsernameInput({ value, error, onChange }: UsernameInputProps) {
  return (
    <>
      <input
        className={error ? styles.inputError : styles.input}
        name="username"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Username"
        aria-invalid={error ? true : undefined}
      />
      {error && <span className={styles.fieldError}>{error}</span>}
    </>
  );
}
