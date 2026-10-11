import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Bot, FileWarning, LayoutGrid, Target } from "lucide-react";
import { MIT_DOMAINS } from "../constants/mitTaxonomy";
import type { DigestMonth } from "../interfaces";
import { useDigestMonth, useDigestMonths } from "../hooks";
import { BarList } from "../components/charts";
import { DigestMonthTabs } from "../components/digest";
import { IncidentList } from "../components/incidents";
import { PageHead, SectionHead } from "../components/layout";
import { Card, EmptyState, ErrorMessage, LoadingSpinner, Pagination, StatCard } from "../components/ui";
import { formatDigestMonth, toYearMonth } from "../utils/digestMonth";
import { domainColor, findDomainByName, taxonomyPaths } from "../utils/taxonomy";

const PAGE_SIZE = 20;

export function MonthlyDigestContainer({ yearMonth }: { yearMonth?: string }) {
  const { months, isLoading: monthsLoading, error: monthsError } = useDigestMonths();
  const { digest, isLoading, error } = useDigestMonth(yearMonth);

  if (monthsLoading) return <LoadingSpinner />;
  if (monthsError) return <ErrorMessage message={monthsError} />;
  if (!yearMonth && months.length > 0) {
    // Open the latest month that has incidents (the current one may be empty so far).
    const latest = months.find((m) => m.total > 0) ?? months[0];
    return <Navigate to={`/digest/${toYearMonth(latest.month)}`} replace />;
  }

  const monthLabel = yearMonth ? formatDigestMonth(`${yearMonth}-01`) : "";

  return (
    <>
      <PageHead
        crumbs={[{ label: "Home", to: "/" }, { label: "Digest", to: "/digest" }, { label: monthLabel }]}
        eyebrow="Monthly digest"
        title={`${monthLabel} in AI incidents`}
        description="Incidents first reported in the month, from the MIT seed corpus and daily news ingestion."
      />
      <DigestMonthTabs months={months} />
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {digest && <DigestMonthView key={digest.month} digest={digest} monthLabel={monthLabel} />}
    </>
  );
}

function DigestMonthView({ digest, monthLabel }: { digest: DigestMonth; monthLabel: string }) {
  const [offset, setOffset] = useState(0);

  if (digest.total === 0) {
    return <EmptyState>No AI incidents were reported in {monthLabel}.</EmptyState>;
  }

  const classified = digest.domain_counts.filter((d) => findDomainByName(d.risk_domain));
  const top = classified[0];
  const topDomain = findDomainByName(top?.risk_domain);
  const delta = digest.total - digest.previous_total;
  const previousLabel = formatDigestMonth(previousMonth(digest.month), "short").split(" ")[0];
  const aiCaused = digest.incidents.filter((i) => i.classifications.some((c) => c.causal_entity === "AI")).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          to="/incidents"
          label="Incidents reported"
          icon={<FileWarning />}
          value={digest.total}
          badge={{
            text: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)} vs ${previousLabel}`,
            tone: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
          }}
          sub={`${digest.previous_total} in the previous month`}
        />
        <StatCard
          to={topDomain ? taxonomyPaths.domain(topDomain.number) : taxonomyPaths.index}
          label="Top risk domain"
          icon={<Target />}
          color={domainColor(topDomain)}
          value={topDomain?.name ?? "No classified incidents"}
          valueIsText
          badge={top ? { text: `${top.count} of ${digest.total}`, tone: "neutral" } : null}
        />
        <StatCard
          to={taxonomyPaths.index}
          label="Domains involved"
          icon={<LayoutGrid />}
          color="var(--data)"
          value={
            <>
              {classified.length}
              <span className="text-[18px] text-fg-faint"> / {MIT_DOMAINS.length}</span>
            </>
          }
          sub="Distinct MIT domains"
        />
        <StatCard
          to={taxonomyPaths.causal("entity", "ai")}
          label="Caused by AI"
          icon={<Bot />}
          color="var(--d7)"
          value={`${Math.round((aiCaused / digest.total) * 100)}%`}
          sub={`${aiCaused} of ${digest.total} incidents`}
        />
      </div>

      <div className="mt-4">
        <Card title="By risk domain" description={monthLabel}>
          <BarList
            items={digest.domain_counts.map((d) => {
              const domain = findDomainByName(d.risk_domain);
              return {
                key: d.risk_domain,
                label: domain ? `${domain.number} · ${domain.shortName}` : d.risk_domain,
                value: d.count,
                color: domainColor(domain),
                to: domain && taxonomyPaths.domain(domain.number),
              };
            })}
          />
        </Card>
      </div>

      <SectionHead
        eyebrow={monthLabel}
        title={`All ${digest.total} incidents`}
        actions={<span className="text-[12px] text-fg-faint">By first report date · newest first</span>}
      />
      <IncidentList incidents={digest.incidents.slice(offset, offset + PAGE_SIZE)} />
      <Pagination offset={offset} limit={PAGE_SIZE} total={digest.incidents.length} onOffsetChange={setOffset} />
    </>
  );
}

function previousMonth(month: string): string {
  const [year, mo] = month.split("-").map(Number);
  return mo === 1 ? `${year - 1}-12-01` : `${year}-${String(mo - 1).padStart(2, "0")}-01`;
}
