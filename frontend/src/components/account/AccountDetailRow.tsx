import type { ReactNode } from "react";

export function AccountDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t py-3 first:border-t-0" style={{ borderColor: "var(--border-soft)" }}>
      <span className="text-[12.5px] text-fg-dim">{label}</span>
      <span className="flex items-center gap-2 text-[13px] text-fg">{children}</span>
    </div>
  );
}
