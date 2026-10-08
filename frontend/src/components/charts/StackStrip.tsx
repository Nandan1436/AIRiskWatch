import type { CSSProperties } from "react";
import styles from "./Charts.module.css";

/** Thin unlabelled 100% bar, used inside stat cards. */
export function StackStrip({ segments }: { segments: { key: string; value: number; color: string }[] }) {
  return (
    <div className={styles.strip} aria-hidden="true">
      {segments.map((s) => (
        <span key={s.key} style={{ flex: s.value, "--c": s.color } as CSSProperties} />
      ))}
    </div>
  );
}
