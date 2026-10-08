import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MIT_CAUSAL, MIT_DOMAINS } from "../constants/mitTaxonomy";
import { SectionHead } from "../components/layout";
import {
  CausalDimensionCard,
  CausalGrid,
  DomainLandscape,
  LandscapeLegend,
  TaxonomyPickers,
} from "../components/taxonomy";
import { ErrorMessage, LoadingSpinner } from "../components/ui";
import { useClassificationBreakdownQuery, useRiskDomainsQuery, useSummaryQuery } from "../hooks";
import { CAUSAL_PARAM } from "../utils/taxonomy";

export function TaxonomyContainer() {
  const { riskDomains, isLoading, error } = useRiskDomainsQuery();
  const { breakdown, error: breakdownError } = useClassificationBreakdownQuery();
  const { summary } = useSummaryQuery();
  const { hash } = useLocation();

  // Honour /taxonomy#causal links once the content has rendered.
  useEffect(() => {
    if (hash && !isLoading) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, isLoading]);

  const loadError = error ?? breakdownError;
  if (isLoading) return <LoadingSpinner />;
  if (loadError) return <ErrorMessage message={loadError} />;

  return (
    <>
      <TaxonomyPickers
        domainCount={MIT_DOMAINS.length}
        subdomainCount={MIT_DOMAINS.reduce((sum, d) => sum + d.subdomains.length, 0)}
        incidentCount={summary?.total_incidents ?? 0}
      />

      <SectionHead
        id="domain"
        eyebrow="Domain taxonomy"
        title="What kind of harm?"
        actions={<LandscapeLegend />}
        className="mt-0!"
      />
      <DomainLandscape riskDomains={riskDomains} />

      <SectionHead
        id="causal"
        eyebrow="Causal taxonomy"
        title="How did the risk come about?"
        description="Three questions applied to every incident, independent of its domain. Click a category to open its page."
      />
      {breakdown && (
        <CausalGrid>
          {MIT_CAUSAL.map((info) => (
            <CausalDimensionCard
              key={info.dimension}
              info={info}
              counts={breakdown[CAUSAL_PARAM[info.dimension]]}
            />
          ))}
        </CausalGrid>
      )}
    </>
  );
}
