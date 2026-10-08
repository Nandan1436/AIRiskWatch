import { Bot, Target, TrendingUp, TriangleAlert } from "lucide-react";
import { Sparkline, StackStrip, lastYears } from "../components/charts";
import { ErrorMessage, StatCard } from "../components/ui";
import {
  useClassificationBreakdownQuery,
  useDigestMonths,
  useIncidentTrendQuery,
  useRiskDomainsQuery,
  useSummaryQuery,
} from "../hooks";
import { formatPercent } from "../utils/formatText";
import { domainColor, findDomainByName, taxonomyPaths } from "../utils/taxonomy";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export function OverviewStatsContainer() {
  const { summary, error } = useSummaryQuery();
  const { riskDomains } = useRiskDomainsQuery();
  const { breakdown } = useClassificationBreakdownQuery();
  const { trend } = useIncidentTrendQuery({});
  const { months } = useDigestMonths();

  if (error) return <ErrorMessage message={error} />;

  const total = summary?.total_incidents ?? 0;
  const thisMonth = months.find((m) => m.month.startsWith(CURRENT_MONTH))?.total;

  // Running total over the last ten years, for the "total" sparkline.
  const decade = lastYears(trend, 10);
  const cumulative: number[] = [];
  let running = trend.filter((p) => p.year < decade[0].year).reduce((s, p) => s + p.count, 0);
  for (const p of decade) {
    running += p.value;
    cumulative.push(running);
  }
  const yearly = summary?.latest_year ? lastYears(trend, 9, summary.latest_year).map((p) => p.value) : [];

  const yoy = summary?.yoy_change_pct;
  const domainTotal = riskDomains.reduce((s, d) => s + d.incident_count, 0);
  const top = riskDomains[0];
  const topDomain = findDomainByName(top?.name);

  const entity = breakdown?.causal_entity ?? [];
  const entityTotal = entity.reduce((s, c) => s + c.incident_count, 0);
  const aiCount = entity.find((c) => c.name === "AI")?.incident_count ?? 0;

  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        to="/incidents"
        label="Total incidents"
        icon={<TriangleAlert />}
        color="var(--accent)"
        value={summary ? total.toLocaleString() : "–"}
        badge={thisMonth ? { text: `+${thisMonth} this month`, tone: "up" } : null}
        sub="All years · all sources"
        chart={<Sparkline values={cumulative} color="var(--accent)" />}
      />
      <StatCard
        to="/incidents"
        label={summary?.latest_year ? `Incidents in ${summary.latest_year}` : "Latest year"}
        icon={<TrendingUp />}
        color="var(--up)"
        value={summary ? summary.latest_year_count.toLocaleString() : "–"}
        badge={
          yoy != null ? { text: `${yoy >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(yoy))}% YoY`, tone: yoy >= 0 ? "up" : "down" } : null
        }
        sub={summary?.latest_year ? `vs ${summary.previous_year_count} in ${summary.latest_year - 1}` : undefined}
        chart={<Sparkline values={yearly} color="var(--up)" variant="bars" />}
      />
      <StatCard
        to={topDomain ? taxonomyPaths.domain(topDomain.number) : taxonomyPaths.index}
        label="Top risk domain"
        icon={<Target />}
        color={domainColor(topDomain)}
        value={topDomain?.name ?? top?.name ?? "–"}
        valueIsText
        badge={top ? { text: `${formatPercent(top.incident_count, domainTotal)} of all`, tone: "neutral" } : null}
        sub="7 MIT domains · 24 subdomains"
      >
        <StackStrip
          segments={riskDomains.map((d) => ({
            key: d.name,
            value: d.incident_count,
            color: domainColor(findDomainByName(d.name)),
          }))}
        />
      </StatCard>
      <StatCard
        to={taxonomyPaths.causal("entity", "ai")}
        label="Caused by AI"
        icon={<Bot />}
        color="var(--data)"
        value={breakdown ? formatPercent(aiCount, entityTotal) : "–"}
        badge={{ text: "Causal · Entity", tone: "neutral" }}
        sub={`${aiCount.toLocaleString()} incidents · the AI system's own decision or action`}
      />
    </div>
  );
}
