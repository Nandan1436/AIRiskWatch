interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trendPct?: number | null;
  trendLabel?: string;
}

export function StatCard({ label, value, hint, trendPct, trendLabel }: StatCardProps) {
  const trendColor =
    trendPct == null ? undefined : trendPct >= 0 ? "var(--green)" : "#e0603a";

  return (
    <div
      className="rounded-[18px] border p-[18px_22px]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.07em] text-fg-faint">
        {label}
      </div>
      <div className="flex items-baseline gap-[9px]">
        <span className="font-mono text-[26px] font-bold tabular-nums tracking-tight text-fg">
          {value}
        </span>
        {trendPct != null && (
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: trendColor }}
          >
            {trendPct >= 0 ? "+" : ""}
            {trendPct}%
          </span>
        )}
      </div>
      {(hint || trendLabel) && (
        <p className="mt-1 text-[11.5px] text-fg-dim">{trendLabel ?? hint}</p>
      )}
    </div>
  );
}
