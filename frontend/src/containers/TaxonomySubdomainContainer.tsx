import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import type { MitDomain, MitSubdomain } from "../constants/mitTaxonomy";
import { Breadcrumbs } from "../components/layout";
import { CausalProfile, OrganizationList, YearBars, lastYears } from "../components/charts";
import { RelatedRow, SubdomainCard, TaxonomyHero } from "../components/taxonomy";
import { Card, Chip, LoadingSpinner } from "../components/ui";
import {
  useClassificationBreakdownQuery,
  useIncidentCountQuery,
  useIncidentTrendQuery,
  useOrganizationsQuery,
  useRiskDomainsQuery,
  useSamePeriodChange,
} from "../hooks";
import { domainColor, findDomainByName, findSubdomainByName, taxonomyPaths } from "../utils/taxonomy";
import { changeKpi, isoDaysAgo, pct, pointsDiff, shareOf } from "../utils/taxonomyStats";
import { TaxonomyIncidentsContainer } from "./TaxonomyIncidentsContainer";

interface TaxonomySubdomainContainerProps {
  domain: MitDomain;
  subdomain: MitSubdomain;
}

export function TaxonomySubdomainContainer({ domain, subdomain }: TaxonomySubdomainContainerProps) {
  const filters = { risk_subdomain: subdomain.name };
  const color = domainColor(domain);
  const { riskDomains, isLoading } = useRiskDomainsQuery();
  const { breakdown } = useClassificationBreakdownQuery(filters);
  const { breakdown: overall } = useClassificationBreakdownQuery();
  const { trend } = useIncidentTrendQuery(filters);
  const { organizations, unattributedIncidentCount } = useOrganizationsQuery({ ...filters, limit: 5 });
  const change = useSamePeriodChange(filters);
  const { count: lastYearCount } = useIncidentCountQuery({ ...filters, date_from: isoDaysAgo(365) });

  if (isLoading) return <LoadingSpinner />;

  // Subdomain counts across every domain, largest first, for the rank KPI.
  const allSubs = riskDomains
    .flatMap((d) => d.subdomains)
    .map((s) => ({ code: findSubdomainByName(s.name)?.subdomain.code, count: s.incident_count }))
    .sort((a, b) => b.count - a.count);
  const subCount = (code: string) => allSubs.find((s) => s.code === code)?.count ?? 0;
  const count = subCount(subdomain.code);
  const rank = allSubs.findIndex((s) => s.code === subdomain.code) + 1;
  const domainCount = riskDomains.find((d) => findDomainByName(d.name)?.number === domain.number)?.incident_count ?? 0;
  const allCount = riskDomains.reduce((sum, d) => sum + d.incident_count, 0);
  const siblings = domain.subdomains.filter((s) => s.code !== subdomain.code);
  const maxSibling = Math.max(0, ...domain.subdomains.map((s) => subCount(s.code)));
  const intentShare = shareOf(breakdown?.intent, "Intentional");
  const humanShare = shareOf(breakdown?.causal_entity, "Human");
  const yoy = changeKpi(change.pct);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Taxonomy", to: taxonomyPaths.index },
          { label: "MIT Domain", to: `${taxonomyPaths.index}#domain` },
          { label: `${domain.number} · ${domain.name}`, to: taxonomyPaths.domain(domain.number) },
          { label: `${subdomain.code} ${subdomain.name}` },
        ]}
      />
      <TaxonomyHero
        color={color}
        tag={
          <>
            <LayoutGrid /> MIT Domain taxonomy · Subdomain of{" "}
            <Link to={taxonomyPaths.domain(domain.number)}>
              Domain {domain.number} · {domain.name}
            </Link>
          </>
        }
        marker={subdomain.code}
        title={subdomain.name}
        definition={subdomain.definition}
        kpis={[
          { value: count.toLocaleString(), label: "incidents" },
          {
            value: pct(domainCount ? count / domainCount : 0),
            label: `of domain ${domain.number} · ${pct(allCount ? count / allCount : 0)} of all`,
          },
          { ...yoy, label: `${change.year} vs ${change.year - 1} (same period)` },
          { value: breakdown ? pct(intentShare) : "–", label: "intentional" },
          { value: lastYearCount?.toLocaleString() ?? "–", label: "in the last 12 months" },
          { value: rank ? `#${rank}` : "–", label: `largest of ${allSubs.length} subdomains with incidents` },
        ]}
      >
        {siblings.length > 0 && (
          <RelatedRow label="Sibling subdomains:">
            {siblings.map((s) => (
              <Chip key={s.code} to={taxonomyPaths.subdomain(s.code)} color={color} title={s.name}>
                {s.code} {s.name}
              </Chip>
            ))}
          </RelatedRow>
        )}
      </TaxonomyHero>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Incidents per year"
          description={`Subdomain ${subdomain.code} only · ${new Date().getFullYear()} is year to date`}
        >
          <YearBars points={lastYears(trend, 10)} color={color} />
        </Card>
        <Card title="How these incidents came about" description="Causal taxonomy profile · click a segment">
          {breakdown && <CausalProfile breakdown={breakdown} />}
          {breakdown && overall && (
            <p className="mb-0 mt-4 text-[12px] text-fg-faint">
              Compared with all incidents:{" "}
              <b className="text-fg">{pointsDiff(humanShare, shareOf(overall.causal_entity, "Human"))}</b> human-caused,{" "}
              <b className="text-fg">{pointsDiff(intentShare, shareOf(overall.intent, "Intentional"))}</b> intentional.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Most-named organizations" description="As alleged deployer">
          <OrganizationList organizations={organizations} unattributed={unattributedIncidentCount} />
        </Card>
        <Card
          title={`Within domain ${domain.number}`}
          description="How this subdomain compares with its siblings"
          scroll
        >
          {domain.subdomains.map((s) => (
            <SubdomainCard key={s.code} subdomain={s} count={subCount(s.code)} total={domainCount} max={maxSibling} />
          ))}
        </Card>
      </div>

      <TaxonomyIncidentsContainer title={`All ${count.toLocaleString()} incidents in ${subdomain.code}`} filters={filters} />
    </>
  );
}
