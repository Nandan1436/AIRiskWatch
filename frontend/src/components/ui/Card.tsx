import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Card({ title, description, children }: CardProps) {
  return (
    <section
      className="rounded-[18px] border p-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
    >
      {title && <h2 className="text-[15px] font-bold tracking-tight text-fg">{title}</h2>}
      {description && <p className="mt-1 text-[12.5px] text-fg-dim">{description}</p>}
      <div className={title || description ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}
