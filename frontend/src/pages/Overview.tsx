import { OverviewHero } from "../components/overview/OverviewHero";
import { OverviewInsightsContainer, OverviewStatsContainer, RecentIncidentsContainer } from "../containers";
import { useSummaryQuery } from "../hooks";

export function Overview() {
  const { summary } = useSummaryQuery();
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <OverviewHero totalIncidents={summary?.total_incidents} />
      <OverviewStatsContainer />
      <OverviewInsightsContainer />
      <RecentIncidentsContainer />
    </div>
  );
}
