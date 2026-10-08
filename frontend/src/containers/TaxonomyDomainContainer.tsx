import { LayoutGrid } from "lucide-react";
import { MIT_DOMAINS, type MitDomain } from "../constants/mitTaxonomy";
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

export function TaxonomyDomainContainer({ domain }: { domain: MitDomain }) {
  const filters = { risk_domain: domain.name };
  const color = domainColor(domain);
  const { riskDomains, isLoading } = useRiskDomainsQuery();
  const { breakdown } = useClassificationBreakdownQuery(filters);
  const { breakdown: overall } = useClassificationBreakdownQuery();
  const { trend } = useIncidentTrendQuery(filters);
  const { organizations, unattributedIncidentCount } = useOrganizationsQuery({ ...filters, limit: 5 });
  const change = useSamePeriodChange(filters);
  const { count: lastYearCount } = useIncidentCountQuery({ ...filters, date_from: isoDaysAgo(365) });

  if (isLoading) return <LoadingSpinner />;

  const ranked = riskDomains.filter((d) => findDomainByName(d.name));
  const rank = ranked.findIndex((d) => findDomainByName(d.name)?.number === domain.number) + 1;
  const apiDomain = ranked[rank - 1];
  const count = apiDomain?.incident_count ?? 0;
  const allCount = ranked.reduce((sum, d) => sum + d.incident_count, 0);
  const subCounts = new Map(
    (apiDomain?.subdomains ?? []).map((s) => [findSubdomainByName(s.name)?.subdomain.code, s.incident_count]),
  );
  const maxSub = Math.max(0, ...subCounts.values());
  const humanShare = shareOf(breakdown?.causal_entity, "Human");
  const intentShare = shareOf(breakdown?.intent, "Intentional");
  const yoy = changeKpi(change.pct);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Taxonomy", to: taxonomyPaths.index },
          { label: "MIT Domain", to: `${taxonomyPaths.index}#domain` },
          { label: `${domain.number} · ${domain.name}` },
        ]}
      />
      <TaxonomyHero
        color={color}
        tag={
          <>
            <LayoutGrid /> MIT Domain taxonomy · Domain {domain.number} of {MIT_DOMAINS.length}
          </>
        }
        marker={domain.number}
        title={domain.name}
        definition={domain.definition}
        kpis={[
          { value: count.toLocaleString(), label: "incidents" },
          { value: pct(allCount ? count / allCount : 0), label: `of classified incidents · rank ${rank} of 7` },
          { ...yoy, label: `${change.year} vs ${change.year - 1} (same period)` },
          { value: breakdown ? pct(humanShare) : "–", label: "caused by humans" },
          { value: domain.subdomains.length, label: "subdomains" },
          { value: lastYearCount?.toLocaleString() ?? "–", label: "in the last 12 months" },
        ]}
      >
        <RelatedRow label="Other domains:">
          {MIT_DOMAINS.filter((d) => d.number !== domain.number).map((d) => (
            <Chip key={d.number} to={taxonomyPaths.domain(d.number)} color={domainColor(d)} dot title={d.name}>
              {d.number}
            </Chip>
          ))}
        </RelatedRow>
      </TaxonomyHero>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card
          title="Incidents per year"
          description={`Domain ${domain.number} only · ${new Date().getFullYear()} is year to date`}
        >
          <YearBars points={lastYears(trend, 10)} color={color} />
        </Card>
        <Card title="Subdomains" description="Click one for its definition and incidents" scroll>
          {domain.subdomains.map((sub) => (
            <SubdomainCard
              key={sub.code}
              subdomain={sub}
              count={subCounts.get(sub.code) ?? 0}
              total={count}
              max={maxSub}
            />
          ))}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
        <Card title="Most-named organizations" description="As alleged deployer">
          <OrganizationList organizations={organizations} unattributed={unattributedIncidentCount} />
        </Card>
      </div>

      <TaxonomyIncidentsContainer
        title={`All ${count.toLocaleString()} incidents in this domain`}
        filters={filters}
        narrowBy={{ kind: "subdomain", domain }}
      />
    </>
  );
}
