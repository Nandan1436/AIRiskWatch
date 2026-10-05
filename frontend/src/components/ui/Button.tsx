import type { ButtonHTMLAttributes, CSSProperties } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: { background: "var(--accent)", color: "#fff", borderColor: "transparent" },
  secondary: { background: "var(--surface-2)", color: "var(--fg)", borderColor: "var(--border)" },
  danger: {
    background: "color-mix(in srgb, #e0603a 14%, var(--surface))",
    color: "#e0603a",
    borderColor: "color-mix(in srgb, #e0603a 40%, transparent)",
  },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", style, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-[10px] border px-4 py-[9px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ ...VARIANT_STYLES[variant], ...style }}
    />
  );
}
