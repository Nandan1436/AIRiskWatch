import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, ...inputProps }: TextFieldProps) {
  const inputId = id ?? inputProps.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-semibold text-fg-dim">{label}</span>
      <input
        id={inputId}
        {...inputProps}
        className="rounded-[10px] border px-3 py-[9px] text-[13.5px] text-fg outline-none transition-colors focus:border-accent disabled:opacity-60"
        style={{
          background: "var(--surface-2)",
          borderColor: error ? "#e0603a" : "var(--border)",
        }}
        aria-invalid={error ? true : undefined}
      />
      {error && <span className="text-[12px]" style={{ color: "#e0603a" }}>{error}</span>}
    </label>
  );
}
