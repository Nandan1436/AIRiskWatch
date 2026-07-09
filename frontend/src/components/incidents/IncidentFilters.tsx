import type { IncidentFilterState } from "../../hooks/incidentHooks/useFilterIncidents";
import type { RiskDomain } from "../../interfaces";
import { decodeEntities } from "../../utils/formatText";
import styles from "./IncidentFilters.module.css";

interface IncidentFiltersProps {
  filters: IncidentFilterState;
  riskDomains: RiskDomain[];
  onFilterChange: (next: Partial<IncidentFilterState>) => void;
}

export function IncidentFilters({
  filters,
  riskDomains,
  onFilterChange,
}: IncidentFiltersProps) {
  const selectedDomain = riskDomains.find(
    (d) => d.name === filters.riskDomain,
  );
  const filtersActive = !!(
    filters.search.trim() ||
    filters.riskDomain ||
    filters.riskSubdomain ||
    filters.dateFrom ||
    filters.dateTo
  );

  return (
    <div
      className="mb-5 rounded-2xl border p-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-[1_1_260px]">
          <span className={styles.fieldLabel}>Search</span>
          <span className="relative block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search incident titles…"
              className={`${styles.control} py-2.5 pl-[34px] pr-3 text-[13.5px]`}
            />
          </span>
        </label>

        <label className="min-w-[180px] flex-[0_1_210px]">
          <span className={styles.fieldLabel}>Risk domain</span>
          <select
            value={filters.riskDomain}
            onChange={(e) =>
              onFilterChange({ riskDomain: e.target.value, riskSubdomain: "" })
            }
            className={`${styles.control} cursor-pointer px-3 py-2.5 text-[13.5px]`}
          >
            <option value="">All domains</option>
            {riskDomains.map((d) => (
              <option key={d.name} value={d.name}>
                {decodeEntities(d.name)} ({d.incident_count})
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[180px] flex-[0_1_220px]">
          <span className={styles.fieldLabel}>Risk subdomain</span>
          <select
            value={filters.riskSubdomain}
            onChange={(e) =>
              onFilterChange({ riskSubdomain: e.target.value })
            }
            disabled={!selectedDomain}
            className={`${styles.control} cursor-pointer px-3 py-2.5 text-[13.5px]`}
          >
            <option value="">
              {selectedDomain ? "All subdomains" : "Select a domain first"}
            </option>
            {selectedDomain?.subdomains.map((s) => (
              <option key={s.name} value={s.name}>
                {decodeEntities(s.name)} ({s.incident_count})
              </option>
            ))}
          </select>
        </label>

        <label className="flex-none">
          <span className={styles.fieldLabel}>From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            className={`${styles.control} px-[11px] py-2 text-[13px]`}
          />
        </label>
        <label className="flex-none">
          <span className={styles.fieldLabel}>To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            className={`${styles.control} px-[11px] py-2 text-[13px]`}
          />
        </label>

        {filtersActive && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                search: "",
                riskDomain: "",
                riskSubdomain: "",
                dateFrom: "",
                dateTo: "",
              })
            }
            className={styles.clearBtn}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
