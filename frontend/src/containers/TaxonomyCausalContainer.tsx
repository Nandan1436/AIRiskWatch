import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { GitFork } from "lucide-react";
import {
  MIT_CAUSAL,
  type CausalCategory,
  type CausalDimensionInfo,
} from "../constants/mitTaxonomy";
import { Breadcrumbs } from "../components/layout";
import { BarList, CausalProfile, YearBars, lastYears } from "../components/charts";
import { RelatedRow, TaxonomyHero, causalIcon } from "../components/taxonomy";
import { Card, Chip, LoadingSpinner, SegmentedControl } from "../components/ui";
import {
  useClassificationBreakdownQuery,
  useIncidentCountQuery,
  useIncidentTrendQuery,
  useSamePeriodChange,
} from "../hooks";
import { CAUSAL_PARAM, domainColor, findDomainByName, taxonomyPaths } from "../utils/taxonomy";
import { changeKpi, isoDaysAgo, pct, shareOf } from "../utils/taxonomyStats";
import { TaxonomyIncidentsContainer } from "./TaxonomyIncidentsContainer";

type ShareMode = "share" | "count";

interface TaxonomyCausalContainerProps {
  info: CausalDimensionInfo;
  category: CausalCategory;
}

export function TaxonomyCausalContainer({ info, category }: TaxonomyCausalContainerProps) {
  const [mode, setMode] = useState<ShareMode>("share");
  const param = CAUSAL_PARAM[info.dimension];
  const filters = { [param]: category.name };
  const { breakdown, isLoading } = useClassificationBreakdownQuery(filters);
  const { breakdown: overall } = useClassificationBreakdownQuery();
  const { trend } = useIncidentTrendQuery(filters);
  const { trend: overallTrend } = useIncidentTrendQuery({});
  const change = useSamePeriodChange(filters);
  const { count } = useIncidentCountQuery(filters);
  const { count: lastYearCount } = useIncidentCountQuery({ ...filters, date_from: isoDaysAgo(365) });

  if (isLoading || !breakdown) return <LoadingSpinner />;

  const Icon = causalIcon(info.dimension, category.slug);
  const share = shareOf(overall?.[param], category.name);
  const topDomain = findDomainByName(breakdown.risk_domain[0]?.name);
  const otherDims = MIT_CAUSAL.filter((d) => d.dimension !== info.dimension);
  // The most common category of the next dimension, e.g. "87% unintentional".
  const pairDim = otherDims[0];
  const pairTop = [...breakdown[CAUSAL_PARAM[pairDim.dimension]]].sort((a, b) => b.incident_count - a.incident_count)[0];

  const overallByYear = new Map(overallTrend.map((p) => [p.year, p.count]));
  const yearly = lastYears(trend, 10).map((p) => ({
    year: p.year,
    value: mode === "count" ? p.value : overallByYear.get(p.year) ? (p.value / overallByYear.get(p.year)!) * 100 : 0,
  }));
  const yoy = changeKpi(change.pct);
  const title = `${info.label}: ${category.name}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Taxonomy", to: taxonomyPaths.index },
          { label: "MIT Causal", to: `${taxonomyPaths.index}#causal` },
          { label: info.label, to: `${taxonomyPaths.index}#causal` },
          { label: category.name },
        ]}
      />
      <TaxonomyHero
        color="var(--data)"
        tag={
          <>
            <GitFork /> MIT Causal taxonomy · {info.label} dimension
          </>
        }
        marker={<Icon />}
        markerIsIcon
        title={title}
        definition={
          <>
            <b>{category.definition}.</b> The <em>{info.label}</em> dimension asks: {info.question.toLowerCase()}{" "}
            Its categories are{" "}
            {info.categories.map((c, i) => (
              <Fragment key={c.slug}>
                {i > 0 && (i === info.categories.length - 1 ? " and " : ", ")}
                {c.slug === category.slug ? (
                  <b>{c.name}</b>
                ) : (
                  <Link to={taxonomyPaths.causal(info.dimension, c.slug)} className="font-medium text-data">
                    {c.name}
                  </Link>
                )}
              </Fragment>
            ))}
            .
          </>
        }
        kpis={[
          { value: count?.toLocaleString() ?? "–", label: "incidents" },
          { value: pct(share), label: `of incidents classified by ${info.label.toLowerCase()}` },
          { ...yoy, label: `${change.year} vs ${change.year - 1} (same period)` },
          {
            value: pairTop ? pct(shareOf(breakdown[CAUSAL_PARAM[pairDim.dimension]], pairTop.name)) : "–",
            label: pairTop ? `also ${pairTop.name.toLowerCase()}` : pairDim.label,
          },
          { value: topDomain ? topDomain.number : "–", label: topDomain ? `top domain (${topDomain.shortName})` : "top domain" },
          { value: lastYearCount?.toLocaleString() ?? "–", label: "in the last 12 months" },
        ]}
      >
        <RelatedRow label="Other causal categories:">
          {MIT_CAUSAL.flatMap((dim) =>
            dim.categories
              .filter((c) => !(dim.dimension === info.dimension && c.slug === category.slug))
              .map((c) => (
                <Chip key={`${dim.dimension}-${c.slug}`} to={taxonomyPaths.causal(dim.dimension, c.slug)}>
                  {dim.label} · {c.name}
                </Chip>
              )),
          )}
        </RelatedRow>
      </TaxonomyHero>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Which domains these harms fall into" description="Click a domain to open it">
          <BarList
            items={breakdown.risk_domain.map((d) => {
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
        <Card title="The other causal dimensions" description={`For incidents classified as ${title}`}>
          <CausalProfile breakdown={breakdown} only={otherDims.map((d) => d.dimension)} />
        </Card>
      </div>

      <Card
        className="mt-4"
        title={mode === "share" ? `Share of incidents: ${title}, per year` : `Incidents: ${title}, per year`}
        description={`${new Date().getFullYear()} is year to date`}
        actions={
          <SegmentedControl
            label="Show share or count"
            options={[
              { value: "share", label: "Share" },
              { value: "count", label: "Count" },
            ]}
            value={mode}
            onChange={setMode}
          />
        }
      >
        <YearBars
          points={yearly}
          color="var(--data)"
          max={mode === "share" ? 100 : undefined}
          formatValue={(v) => (mode === "share" ? `${Math.round(v)}%` : String(v))}
        />
      </Card>

      <TaxonomyIncidentsContainer
        title={`All ${count?.toLocaleString() ?? ""} incidents: ${title}`}
        filters={filters}
        narrowBy={{ kind: "domain" }}
      />
    </>
  );
}
