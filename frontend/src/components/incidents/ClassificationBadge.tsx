import type { IncidentClassification } from "../../interfaces";
import { getDomainColor, domainBadgeStyle } from "../../utils/domainColor";
import { decodeEntities } from "../../utils/formatText";

interface ClassificationBadgeProps {
  classification: IncidentClassification;
  variant?: "compact" | "full";
}

export function ClassificationBadge({
  classification,
  variant = "compact",
}: ClassificationBadgeProps) {
  const domain = classification.risk_domain;
  if (!domain) return null;
  const color = getDomainColor(domain);
  const style = domainBadgeStyle(color);
  const label =
    variant === "full" && classification.risk_subdomain
      ? `${decodeEntities(domain)} · ${decodeEntities(classification.risk_subdomain)}`
      : decodeEntities(domain);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-[3px] pl-2 pr-2.5 text-[11.5px] font-semibold leading-[1.6]"
      style={{
        background: style.background,
        color: style.color,
        border: style.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: style.dot }}
      />
      {label}
    </span>
  );
}
