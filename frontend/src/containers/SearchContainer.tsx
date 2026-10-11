import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layers } from "lucide-react";
import { useSearchIncidents } from "../hooks/searchHooks";
import {
  SearchBox,
  SearchFacets,
  SearchResultCard,
  SearchSummary,
  type FacetOption,
} from "../components/search";
import { EmptyState, ErrorMessage, LoadingSpinner, Pagination } from "../components/ui";
import type { SearchResultItem } from "../interfaces";
import { domainColor, findDomainByName } from "../utils/taxonomy";

const PAGE_SIZE = 20;
const THIS_YEAR = new Date().getFullYear();

export function SearchContainer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { summary, results, hasResults, isLoading, error } = useSearchIncidents(query);

  return (
    <>
      <SearchBox
        key={`box:${query}`}
        initialQuery={query}
        onSubmit={(next) => setSearchParams({ q: next })}
        isLoading={isLoading}
        meta={
          <>
            <span>
              <Layers />
              Semantic retrieval → cross-encoder rerank
            </span>
            {hasResults && <span>Top {results.length} results</span>}
          </>
        }
      />

      {!query && (
        <div className="mt-6">
          <EmptyState>
            Search by meaning, not keywords: describe what happened or the kind of AI system you care about.
          </EmptyState>
        </div>
      )}
      {isLoading && <LoadingSpinner label="Searching and summarising…" />}
      {error && (
        <div className="mt-6">
          <ErrorMessage message={error} />
        </div>
      )}
      {hasResults && !isLoading && <SearchResults key={`results:${query}`} summary={summary} results={results} />}
    </>
  );
}

function yearBucket(date: string | null): string {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  if (year >= THIS_YEAR - 1) return String(year);
  return Number.isNaN(year) ? "undated" : "earlier";
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/** Facets and paging are applied client-side to the fixed top-K result set. */
function SearchResults({ summary, results }: { summary: string | null; results: SearchResultItem[] }) {
  const [domains, setDomains] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);

  // An incident with several classifications can come back more than once.
  const unique = [...new Map(results.map((r) => [r.incident_id, r])).values()];
  const domainKey = (r: SearchResultItem) => r.risk_domain ?? "Unclassified";

  const domainOptions: FacetOption[] = [...countBy(unique, domainKey)]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => {
      const domain = findDomainByName(name);
      return { key: name, label: domain?.shortName ?? name, count, color: domainColor(domain) };
    });
  const yearCounts = countBy(unique, (r) => yearBucket(r.incident_date));
  const yearOptions: FacetOption[] = [
    { key: String(THIS_YEAR), label: String(THIS_YEAR) },
    { key: String(THIS_YEAR - 1), label: String(THIS_YEAR - 1) },
    { key: "earlier", label: `${THIS_YEAR - 2} and earlier` },
    { key: "undated", label: "Undated" },
  ]
    .map((o) => ({ ...o, count: yearCounts.get(o.key) ?? 0 }))
    .filter((o) => o.count > 0);

  const filtered = unique.filter(
    (r) =>
      (domains.length === 0 || domains.includes(domainKey(r))) &&
      (years.length === 0 || years.includes(yearBucket(r.incident_date))),
  );

  function toggle(list: string[], setList: (next: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
    setOffset(0);
  }

  return (
    <div className="mt-[26px] grid items-start gap-6 lg:grid-cols-[250px_1fr]">
      <SearchFacets
        domains={domainOptions}
        years={yearOptions}
        selectedDomains={domains}
        selectedYears={years}
        onToggleDomain={(key) => toggle(domains, setDomains, key)}
        onToggleYear={(key) => toggle(years, setYears, key)}
      />
      <div className="min-w-0">
        {summary && <SearchSummary summary={summary} />}
        {filtered.length === 0 ? (
          <EmptyState>No results match these filters.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.slice(offset, offset + PAGE_SIZE).map((r) => (
              <SearchResultCard key={r.incident_id} result={r} />
            ))}
          </div>
        )}
        <Pagination
          offset={offset}
          limit={PAGE_SIZE}
          total={filtered.length}
          onOffsetChange={setOffset}
          noun="results"
        />
      </div>
    </div>
  );
}
