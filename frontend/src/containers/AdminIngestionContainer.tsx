import { IngestionSummaryCard } from "../components/admin";
import { Button, Card, ErrorMessage } from "../components/ui";
import { useRunIngestion } from "../hooks/adminHooks";

export function AdminIngestionContainer() {
  const { run, summary, isRunning, error } = useRunIngestion();

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <Card
        title="Run ingestion now"
        description="Scrapes the configured news sources for AI-related articles from the lookback window, filters them with the LLM, and creates or attaches incidents. This spends LLM quota and can take several minutes."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={run} disabled={isRunning}>
            {isRunning ? "Running…" : "Run ingestion"}
          </Button>
          {isRunning && (
            <span className="flex items-center gap-2 text-[12.5px] text-fg-dim">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
              Keep this tab open until the run finishes.
            </span>
          )}
        </div>
      </Card>
      {error && <ErrorMessage message={error} />}
      {summary && <IngestionSummaryCard summary={summary} />}
    </div>
  );
}
