import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./SelectField.module.css";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Native select styled as the mockup's "Label  Value ⌄" control. */
export function SelectField({ label, children, className = "", ...props }: SelectFieldProps) {
  return (
    <label className={`${styles.select} ${className}`}>
      <span className={styles.label}>{label}</span>
      <select {...props} className={styles.control}>
        {children}
      </select>
      <ChevronDown className={styles.chevron} />
    </label>
  );
}
