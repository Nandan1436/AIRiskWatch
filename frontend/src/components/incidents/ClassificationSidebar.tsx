import type { IncidentClassification } from "../../interfaces";
import { getDomainColor } from "../../utils/domainColor";
import { decodeEntities } from "../../utils/formatText";

const ICONS = {
  cpu: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  user: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  pre: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6m0 0 3-3m-3 3L9 5" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
    </svg>
  ),
  post: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  intentional: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.5" />
    </svg>
  ),
  unintentional: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

function tint(hex: string) {
  return {
    background: `color-mix(in srgb, ${hex} 16%, var(--surface))`,
    color: `color-mix(in srgb, ${hex} 82%, var(--fg))`,
  };
}

export function ClassificationSidebar({
  classifications,
}: {
  classifications: IncidentClassification[];
}) {
  const primary = classifications[0];

  const attributes = primary
    ? [
        primary.causal_entity
          ? {
              label: "Causal entity",
              value:
                primary.causal_entity === "AI"
                  ? "AI-caused"
                  : primary.causal_entity === "Human"
                    ? "Human-caused"
                    : primary.causal_entity,
              icon: primary.causal_entity === "AI" ? ICONS.cpu : ICONS.user,
              ...tint(primary.causal_entity === "AI" ? "#2aa7d8" : "#9168c9"),
            }
          : null,
        primary.timing
          ? {
              label: "Timing",
              value: primary.timing,
              icon: primary.timing.startsWith("Pre") ? ICONS.pre : ICONS.post,
              ...tint(primary.timing.startsWith("Pre") ? "#e0a32e" : "#4fa35a"),
            }
          : null,
        primary.intent
          ? {
              label: "Intent",
              value: primary.intent,
              icon:
                primary.intent === "Intentional"
                  ? ICONS.intentional
                  : ICONS.unintentional,
              ...tint(primary.intent === "Intentional" ? "#e0603a" : "#7e93ad"),
            }
          : null,
      ].filter((a): a is NonNullable<typeof a> => a !== null)
    : [];

  const seen = new Set<string>();
  const domains = classifications
    .filter((c) => c.risk_domain && !seen.has(c.risk_domain) && seen.add(c.risk_domain))
    .map((c) => ({
      name: decodeEntities(c.risk_domain!),
      color: getDomainColor(c.risk_domain),
    }));

  return (
    <aside
      className="sticky top-24 rounded-2xl border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.09em] text-fg-faint">
        Classification dimensions
      </div>
      <p className="mb-[18px] text-[12px] leading-[1.5] text-fg-dim">
        How this incident is coded across the repository&rsquo;s causal
        taxonomy.
      </p>

      {attributes.map((a) => (
        <div
          key={a.label}
          className="flex items-center gap-[13px] border-t border-border-soft py-[13px]"
        >
          <span
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: a.background, color: a.color }}
          >
            {a.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[.07em] text-fg-faint">
              {a.label}
            </span>
            <span className="mt-0.5 block text-[14px] font-semibold text-fg">
              {a.value}
            </span>
          </span>
        </div>
      ))}

      {domains.length > 0 && (
        <div className="mt-4 border-t border-border-soft pt-4">
          <div className="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[.07em] text-fg-faint">
            Risk domains
          </div>
          <div className="flex flex-col gap-2">
            {domains.map((d) => (
              <div key={d.name} className="flex items-center gap-[9px]">
                <span
                  className="h-[9px] w-[9px] flex-shrink-0 rounded-[3px]"
                  style={{ background: d.color }}
                />
                <span className="text-[12.5px] font-medium text-fg">
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {attributes.length === 0 && domains.length === 0 && (
        <div className="border-t border-border-soft pt-[13px] text-[12.5px] text-fg-faint">
          Not yet classified against the MIT taxonomy.
        </div>
      )}
    </aside>
  );
}
