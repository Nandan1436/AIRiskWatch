import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div
        className="w-full max-w-[400px] rounded-[20px] border p-8"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow)",
          animation: "riseIn .28s ease both",
        }}
      >
        <h1 className="text-[21px] font-bold tracking-tight text-fg">{title}</h1>
        <p className="mt-1 text-[13px] text-fg-dim">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 text-center text-[12.5px] text-fg-dim">{footer}</div>
      </div>
    </div>
  );
}
