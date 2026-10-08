import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChecklistGroupHeader,
  ChecklistItemCard,
  ChecklistSummary,
  SystemDescriptionForm,
} from "../components/checklist";
import { Card, EmptyState, ErrorMessage, LoadingSpinner } from "../components/ui";
import { useSearchIncidents } from "../hooks/searchHooks";
import { buildChecklist, type Severity } from "../utils/riskChecklist";

export function RiskChecklistContainer() {
  // The description lives in the URL so the checklist survives Back and reloads.
  const [searchParams, setSearchParams] = useSearchParams();
  const description = searchParams.get("system") ?? "";
  const { results, hasResults, isLoading, error } = useSearchIncidents(description);

  // Reviewed subdomain codes, reset whenever the description changes.
  const [reviewed, setReviewed] = useState({ description, codes: new Set<string>() });
  const done = reviewed.description === description ? reviewed.codes : new Set<string>();

  function toggle(code: string) {
    const codes = new Set(done);
    if (codes.has(code)) codes.delete(code);
    else codes.add(code);
    setReviewed({ description, codes });
  }

  const ready = hasResults && !isLoading;
  const { groups, unclassified } = buildChecklist(ready ? results : []);
  const items = groups.flatMap((g) => g.items);
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const item of items) bySeverity[item.severity] += 1;

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SystemDescriptionForm
          key={description}
          initialDescription={description}
          isLoading={isLoading}
          onSubmit={(next) => setSearchParams({ system: next })}
        />
        {ready ? (
          <ChecklistSummary
            reviewed={items.filter((i) => done.has(i.subdomain.code)).length}
            total={items.length}
            matchCount={items.reduce((sum, i) => sum + i.matches.length, 0)}
            bySeverity={bySeverity}
          />
        ) : (
          <Card title="Your checklist" description="Appears here once you describe a system.">
            {isLoading ? (
              <LoadingSpinner label="Finding similar incidents…" />
            ) : (
              <EmptyState>Each item links to the incidents and taxonomy category behind it.</EmptyState>
            )}
          </Card>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {ready && groups.length === 0 && (
        <div className="mt-6">
          <EmptyState>None of the similar incidents are classified yet, so there is nothing to check.</EmptyState>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.domain.number}>
          <ChecklistGroupHeader domain={group.domain} />
          <div className="flex flex-col gap-2.5">
            {group.items.map((item) => (
              <ChecklistItemCard
                key={item.subdomain.code}
                item={item}
                done={done.has(item.subdomain.code)}
                onToggle={() => toggle(item.subdomain.code)}
              />
            ))}
          </div>
        </section>
      ))}

      {ready && unclassified > 0 && (
        <p className="mt-4 text-[12px] text-fg-faint">
          {unclassified} similar {unclassified === 1 ? "incident is" : "incidents are"} not classified yet and
          left out.
        </p>
      )}
    </>
  );
}
