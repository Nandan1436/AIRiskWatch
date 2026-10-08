import { useSearchParams } from "react-router-dom";
import { MIT_DOMAINS, type MitDomain } from "../constants/mitTaxonomy";
import { IncidentList } from "../components/incidents";
import { SectionHead } from "../components/layout";
import { EmptyState, ErrorMessage, LoadingSpinner, Pagination, SelectField } from "../components/ui";
import { INCIDENT_PAGE_SIZE, useIncidentsQuery, usePageParam } from "../hooks";
import type { ClassificationFilters } from "../interfaces";
import { findDomainByNumber, findSubdomainByCode } from "../utils/taxonomy";

const LIST_ID = "incidents";

interface TaxonomyIncidentsContainerProps {
  title: string;
  filters: ClassificationFilters;
  /** Narrow by subdomain within this domain, or by domain (for causal pages). */
  narrowBy?: { kind: "subdomain"; domain: MitDomain } | { kind: "domain" };
}

/** Paginated incidents for a taxonomy category; page and narrowing live in the URL. */
export function TaxonomyIncidentsContainer({ title, filters, narrowBy }: TaxonomyIncidentsContainerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { offset, setPage } = usePageParam(LIST_ID);
  const param = narrowBy?.kind === "subdomain" ? "sub" : "domain";
  const narrowValue = narrowBy ? (searchParams.get(param) ?? "") : "";

  const extra: ClassificationFilters =
    narrowBy?.kind === "subdomain"
      ? { risk_subdomain: findSubdomainByCode(narrowValue)?.subdomain.name }
      : narrowBy?.kind === "domain"
        ? { risk_domain: findDomainByNumber(narrowValue)?.name }
        : {};
  const { incidents, total, isLoading, error } = useIncidentsQuery({
    limit: INCIDENT_PAGE_SIZE,
    offset,
    ...filters,
    ...extra,
  });

  function setNarrow(value: string) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set(param, value);
      else params.delete(param);
      params.delete("page");
      return params;
    });
  }

  return (
    <>
      <SectionHead
        id={LIST_ID}
        eyebrow="Incidents"
        title={title}
        actions={
          narrowBy && (
            <SelectField
              label={narrowBy.kind === "subdomain" ? "Subdomain" : "Domain"}
              value={narrowValue}
              onChange={(e) => setNarrow(e.target.value)}
            >
              <option value="">All</option>
              {narrowBy.kind === "subdomain"
                ? narrowBy.domain.subdomains.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} {s.name}
                    </option>
                  ))
                : MIT_DOMAINS.map((d) => (
                    <option key={d.number} value={d.number}>
                      {d.number} · {d.shortName}
                    </option>
                  ))}
            </SelectField>
          )
        }
      />
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && incidents.length === 0 && <EmptyState>No incidents in this category yet.</EmptyState>}
      {!isLoading && !error && incidents.length > 0 && (
        <>
          <IncidentList incidents={incidents} />
          <Pagination
            offset={offset}
            limit={INCIDENT_PAGE_SIZE}
            total={total}
            onOffsetChange={(next) => setPage(next / INCIDENT_PAGE_SIZE + 1)}
          />
        </>
      )}
    </>
  );
}
