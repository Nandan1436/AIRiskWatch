import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BarList, CausalProfile, TrendAreaChart, lastYears } from "../components/charts";
import { Card, ErrorMessage, LoadingSpinner, SegmentedControl } from "../components/ui";
import { useClassificationBreakdownQuery, useIncidentTrendQuery, useRiskDomainsQuery } from "../hooks";
import { domainColor, findDomainByName, taxonomyPaths } from "../utils/taxonomy";

type Range = "10y" | "20y" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "10y", label: "10y" },
  { value: "20y", label: "20y" },
  { value: "all", label: "All" },
];

const linkClass = "inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-data";

export function OverviewInsightsContainer() {
  const [range, setRange] = useState<Range>("10y");
  const { trend, isLoading: trendLoading, error: trendError } = useIncidentTrendQuery({});
  const { riskDomains, error: domainsError } = useRiskDomainsQuery();
  const { breakdown, error: breakdownError } = useClassificationBreakdownQuery();

  const error = trendError ?? domainsError ?? breakdownError;
  if (error) return <ErrorMessage message={error} />;

  const points =
    range === "all"
      ? trend.map((p) => ({ year: p.year, value: p.count }))
      : lastYears(trend, range === "10y" ? 10 : 20);

  return (
    <>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card
          title="Reported incidents over time"
          description={`Yearly count, all domains · ${new Date().getFullYear()} is year to date`}
          actions={<SegmentedControl label="Time range" options={RANGES} value={range} onChange={setRange} />}
        >
          {trendLoading ? <LoadingSpinner /> : <TrendAreaChart points={points} />}
        </Card>
        <Card
          title="By risk domain"
          description="Click a domain to open its taxonomy page"
          actions={
            <Link to={taxonomyPaths.index} className={linkClass}>
              Taxonomy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <BarList
            items={riskDomains.map((d) => {
              const domain = findDomainByName(d.name);
              return {
                key: d.name,
                label: domain ? `${domain.number} · ${domain.shortName}` : d.name,
                value: d.incident_count,
                color: domainColor(domain),
                to: domain && taxonomyPaths.domain(domain.number),
              };
            })}
          />
        </Card>
      </div>

      <Card
        title="How the harms came about"
        description="MIT causal taxonomy · click any segment"
        actions={
          <Link to={`${taxonomyPaths.index}#causal`} className={linkClass}>
            What do these mean? <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {breakdown && <CausalProfile breakdown={breakdown} columns />}
      </Card>
    </>
  );
}
