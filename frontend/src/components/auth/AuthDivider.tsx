export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.09em] text-fg-faint">
      <span className="h-px flex-1" style={{ background: "var(--border)" }} />
      or
      <span className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}
