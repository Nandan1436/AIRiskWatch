import { useSummaryQuery } from "../hooks";
import { StatCard, LoadingSpinner, ErrorMessage } from "../components/ui";

export function DashboardSummaryContainer() {
  const { summary, isLoading, error } = useSummaryQuery();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!summary) return null;

  const yoyLabel =
    summary.yoy_change_pct != null && summary.latest_year
      ? `vs ${summary.latest_year - 1} (${summary.previous_year_count} incidents)`
      : "Not enough year-over-year data yet";

  return (
    <section className="mb-10">
      <div className="mb-[7px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-accent">
        Overview
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total incidents" value={summary.total_incidents.toLocaleString()} />
        <StatCard
          label="Organizations named"
          value={summary.total_organizations.toLocaleString()}
          hint="As alleged deployer or developer"
        />
        <StatCard
          label="Risk domains"
          value={summary.total_risk_domains.toLocaleString()}
          hint="Distinct MIT taxonomy domains"
        />
        <StatCard
          label={summary.latest_year ? `Incidents in ${summary.latest_year}` : "Latest year"}
          value={summary.latest_year_count.toLocaleString()}
          trendPct={summary.yoy_change_pct}
          trendLabel={yoyLabel}
        />
      </div>
    </section>
  );
}
