import { useRiskDomainsQuery } from "../hooks/riskDomainHooks";
import { useIncidentTrendQuery } from "../hooks/incidentHooks";
import { useClassificationBreakdownQuery } from "../hooks/classificationBreakdownHooks";
import { useOrganizationsQuery } from "../hooks/organizationHooks";
import {
  RiskDomainBarChart,
  IncidentTrendChart,
  ClassificationBreakdownChart,
  OrganizationLeaderboard,
} from "../components/charts";
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
  const {
    breakdown,
    isLoading: isLoadingBreakdown,
    error: breakdownError,
  } = useClassificationBreakdownQuery();
  const {
    organizations,
    totalAttributedIncidents,
    unattributedIncidentCount,
    isLoading: isLoadingOrgs,
    error: orgsError,
  } = useOrganizationsQuery({ limit: 10 });

  const isLoading =
    isLoadingDomains || isLoadingTrend || isLoadingBreakdown || isLoadingOrgs;
  const error = domainsError ?? trendError ?? breakdownError ?? orgsError;

  return (
    <section className="mb-10">
      <div className="mb-[7px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-accent">
        Governance insight
      </div>
      <h2 className="mb-1 text-[23px] font-bold tracking-tight text-fg">
        Where should oversight attention concentrate?
      </h2>
      <p className="mb-[22px] max-w-[660px] text-[14px] text-fg-dim">
        Risk domains, reporting trend, cause and intent, and the most
        frequently named organizations.
      </p>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error ?? "Unable to load insights."} />}
      {!isLoading && !error && breakdown && (
        <div className="flex flex-col gap-5">
          <IncidentTrendChart trend={trend} />
          <RiskDomainBarChart riskDomains={riskDomains} />
          <ClassificationBreakdownChart breakdown={breakdown} />
          <OrganizationLeaderboard
            organizations={organizations}
            totalAttributedIncidents={totalAttributedIncidents}
            unattributedIncidentCount={unattributedIncidentCount}
          />
        </div>
      )}
    </section>
  );
}
