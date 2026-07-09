import { useRiskDomainsQuery } from "../hooks/riskDomainHooks";
import { useIncidentTrendQuery } from "../hooks/incidentHooks";
import { RiskDomainBarChart, IncidentTrendChart } from "../components/charts";
import { LoadingSpinner, ErrorMessage } from "../components/ui";

export function IncidentInsightsContainer() {
  const {
    riskDomains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useRiskDomainsQuery();
  const {
    trend,
    isLoading: isLoadingTrend,
    error: trendError,
  } = useIncidentTrendQuery({});

  return (
    <section className="mb-10">
      <div className="mb-[7px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-accent">
        Governance insight
      </div>
      <h2 className="mb-1 text-[23px] font-bold tracking-tight text-fg">
        Where should oversight attention concentrate?
      </h2>
      <p className="mb-[22px] max-w-[660px] text-[14px] text-fg-dim">
        Two views of the same incident record: which risk domains dominate,
        and how reporting volume has changed over time.
      </p>

      {(isLoadingDomains || isLoadingTrend) && <LoadingSpinner />}
      {(domainsError || trendError) && (
        <ErrorMessage
          message={domainsError ?? trendError ?? "Unable to load insights."}
        />
      )}
      {!isLoadingDomains && !isLoadingTrend && !domainsError && !trendError && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.05fr_1fr]">
          <RiskDomainBarChart riskDomains={riskDomains} />
          <IncidentTrendChart trend={trend} />
        </div>
      )}
    </section>
  );
}
