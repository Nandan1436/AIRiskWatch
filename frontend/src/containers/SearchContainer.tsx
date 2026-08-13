import { useSearchIncidents } from "../hooks/searchHooks";
import { SearchBox, SearchResultCard } from "../components/search";
import { LoadingSpinner, ErrorMessage } from "../components/ui";

export function SearchContainer() {
  const { search, summary, results, isLoading, error } = useSearchIncidents();

  return (
    <div>
      <SearchBox
        onSubmit={(query) => search({ query })}
        isLoading={isLoading}
      />

      {isLoading && <div className="mt-6"><LoadingSpinner /></div>}
      {error && <div className="mt-6"><ErrorMessage message={error} /></div>}

      {!isLoading && !error && summary && (
        <div className="mt-6">
          <p
            className="rounded-xl px-4 py-3 text-[13.5px] leading-[1.55] text-fg"
            style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }}
          >
            {summary}
          </p>

          {results.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {results.map((result) => (
                <SearchResultCard key={result.incident_id} result={result} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
