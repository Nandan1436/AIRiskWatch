import { Filter, Search, X } from "lucide-react";
import { MIT_CAUSAL, MIT_DOMAINS } from "../../constants/mitTaxonomy";
import { Chip, SelectField } from "../ui";
import {
  CAUSAL_KEYS,
  SINCE_OPTIONS,
  hasActiveFilters,
  type IncidentUrlFilters,
} from "../../utils/incidentFilters";
import {
  domainColor,
  findCausalCategory,
  findCausalDimension,
  findDomainByNumber,
  findSubdomainByCode,
} from "../../utils/taxonomy";
import styles from "./IncidentFilters.module.css";

interface IncidentFiltersProps {
  filters: IncidentUrlFilters;
  onChange: (next: Partial<IncidentUrlFilters>) => void;
  onClear: () => void;
}

const NO_CAUSE = { entity: "", intent: "", timing: "" };

export function IncidentFilters({ filters, onChange, onClear }: IncidentFiltersProps) {
  const domain = findDomainByNumber(filters.domain);
  const subdomain = findSubdomainByCode(filters.sub)?.subdomain;
  // The Cause select edits one causal dimension at a time; links from the
  // taxonomy pages may set more, and those all show as chips below.
  const causeDimension = CAUSAL_KEYS.find((d) => filters[d]);
  const causeValue = causeDimension ? `${causeDimension}:${filters[causeDimension]}` : "";

  function handleCauseChange(value: string) {
    const [dimension, slug] = value.split(":");
    onChange({ ...NO_CAUSE, ...(slug ? { [dimension]: slug } : {}) });
  }

  return (
    <>
      <div className={styles.bar}>
        <label className={styles.search}>
          <Search />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search incident titles…"
            aria-label="Search incident titles"
          />
        </label>
        <SelectField
          label="Domain"
          value={filters.domain}
          onChange={(e) => onChange({ domain: e.target.value, sub: "" })}
        >
          <option value="">All</option>
          {MIT_DOMAINS.map((d) => (
            <option key={d.number} value={d.number}>
              {d.number} · {d.shortName}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Subdomain"
          value={filters.sub}
          disabled={!domain}
          onChange={(e) => onChange({ sub: e.target.value })}
        >
          <option value="">{domain ? "All" : "Pick a domain"}</option>
          {domain?.subdomains.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Cause" value={causeValue} onChange={(e) => handleCauseChange(e.target.value)}>
          <option value="">Any</option>
          {MIT_CAUSAL.map((dim) => (
            <optgroup key={dim.dimension} label={dim.label}>
              {dim.categories.map((c) => (
                <option key={c.slug} value={`${dim.dimension}:${c.slug}`}>
                  {dim.label}: {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
        <SelectField
          label="Date"
          value={filters.since}
          onChange={(e) => onChange({ since: e.target.value as IncidentUrlFilters["since"] })}
        >
          {SINCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      {hasActiveFilters(filters) && (
        <div className={styles.active}>
          <Filter />
          Active:
          {filters.q && (
            <RemovableChip label={`“${filters.q}”`} onRemove={() => onChange({ q: "" })} />
          )}
          {domain && (
            <RemovableChip
              label={`Domain ${domain.number} · ${domain.shortName}`}
              color={domainColor(domain)}
              onRemove={() => onChange({ domain: "", sub: "" })}
            />
          )}
          {subdomain && (
            <RemovableChip
              label={`${subdomain.code} ${subdomain.name}`}
              color={domainColor(domain)}
              onRemove={() => onChange({ sub: "" })}
            />
          )}
          {CAUSAL_KEYS.map((dimension) => {
            const category = findCausalCategory(dimension, filters[dimension]);
            return (
              category && (
                <RemovableChip
                  key={dimension}
                  label={`${findCausalDimension(dimension)?.label}: ${category.name}`}
                  color="var(--data)"
                  onRemove={() => onChange({ [dimension]: "" })}
                />
              )
            );
          })}
          {filters.since && (
            <RemovableChip
              label={SINCE_OPTIONS.find((o) => o.value === filters.since)?.label ?? filters.since}
              onRemove={() => onChange({ since: "" })}
            />
          )}
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear all
          </button>
        </div>
      )}
    </>
  );
}

function RemovableChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <button type="button" className={styles.chipBtn} onClick={onRemove} aria-label={`Remove filter ${label}`}>
      <Chip color={color} solid={Boolean(color)} dot={Boolean(color)}>
        {label}
        <X className={styles.chipX} />
      </Chip>
    </button>
  );
}
