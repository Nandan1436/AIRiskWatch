export function SignInMethodBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full border px-[10px] py-[3px] text-[11.5px] font-semibold text-fg-dim"
      style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
    >
      {label}
    </span>
  );
}
