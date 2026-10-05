import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between gap-6 border-b px-10 py-[18px] backdrop-blur-[10px]"
      style={{
        borderColor: "var(--border-soft)",
        background: "color-mix(in srgb, var(--bg) 82%, transparent)",
      }}
    >
      <div>
        <div className="text-[19px] font-bold tracking-tight text-fg">{title}</div>
        {subtitle && <div className="mt-px text-[12.5px] text-fg-dim">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}
