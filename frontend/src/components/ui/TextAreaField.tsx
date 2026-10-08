import type { TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextAreaField({ label, error, id, ...textareaProps }: TextAreaFieldProps) {
  const inputId = id ?? textareaProps.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-semibold text-fg-dim">{label}</span>
      <textarea
        id={inputId}
        rows={4}
        {...textareaProps}
        className="resize-y rounded-[10px] border px-3 py-[9px] text-[13.5px] text-fg outline-none transition-colors focus:border-accent"
        style={{
          background: "var(--surface-2)",
          borderColor: error ? "var(--up)" : "var(--border)",
        }}
        aria-invalid={error ? true : undefined}
      />
      {error && <span className="text-[12px]" style={{ color: "var(--up)" }}>{error}</span>}
    </label>
  );
}
