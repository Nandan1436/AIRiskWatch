import { Link, Navigate } from "react-router-dom";
import type { DigestMonth } from "../interfaces";
import { useDigestMonth, useDigestMonths } from "../hooks";
import { RiskDomainBarChart } from "../components/charts";
import { IncidentCard } from "../components/incidents";
import { ErrorMessage, LoadingSpinner, StatCard } from "../components/ui";
import { decodeEntities } from "../utils/formatText";
import { formatDigestMonth, toYearMonth } from "../utils/digestMonth";

export function MonthlyDigestContainer({ yearMonth }: { yearMonth?: string }) {
  const { months, isLoading: monthsLoading, error: monthsError } = useDigestMonths();
  const { digest, isLoading, error } = useDigestMonth(yearMonth);

  if (monthsLoading) return <LoadingSpinner />;
  if (monthsError) return <ErrorMessage message={monthsError} />;
  if (!yearMonth && months.length > 0) {
    return <Navigate to={`/digest/${toYearMonth(months[0].month)}`} replace />;
  }

  return (
    <div>
      <nav className="mb-8 flex flex-wrap gap-2">
        {months.map((m) => {
          const ym = toYearMonth(m.month);
          const active = ym === yearMonth;
          return (
            <Link
              key={ym}
              to={`/digest/${ym}`}
              className="flex items-center gap-2 rounded-full border px-4 py-[7px] text-[12.5px] font-medium transition-colors"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                borderColor: active ? "transparent" : "var(--border-soft)",
                color: active ? "#fff" : "var(--fg-dim)",
              }}
            >
              {formatDigestMonth(m.month, "short")}
              <span className="font-mono text-[11px] tabular-nums opacity-80">{m.total}</span>
            </Link>
          );
        })}
      </nav>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {digest && <DigestMonthView digest={digest} />}
    </div>
  );
}

function DigestMonthView({ digest }: { digest: DigestMonth }) {
  const monthLabel = formatDigestMonth(digest.month);
  const topDomain = digest.domain_counts.find((d) => d.risk_domain !== "Unclassified");

  if (digest.total === 0) {
    return (
      <p className="py-16 text-center text-[13px] text-fg-dim">
        No AI incidents were reported in {monthLabel}.
      </p>
    );
  }

  return (
    <>
      <section className="mb-10">
        <div className="mb-[7px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-accent">
          {monthLabel}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Incidents reported"
            value={digest.total.toLocaleString()}
            hint={`Previous month: ${digest.previous_total}`}
          />
          <StatCard
            label="Top risk domain"
            value={topDomain ? topDomain.count.toLocaleString() : "–"}
            hint={topDomain ? decodeEntities(topDomain.risk_domain) : "No classified incidents"}
          />
          <StatCard
            label="Risk domains involved"
            value={digest.domain_counts.filter((d) => d.risk_domain !== "Unclassified").length.toString()}
            hint="Distinct MIT taxonomy domains"
          />
        </div>
      </section>

      <section className="mb-10">
        <RiskDomainBarChart
          riskDomains={digest.domain_counts.map((d) => ({
            name: d.risk_domain,
            incident_count: d.count,
            subdomains: [],
          }))}
        />
      </section>

      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[13px] text-fg-dim">
            <span className="font-mono font-semibold text-fg">{digest.total}</span> incidents reported in{" "}
            {monthLabel}
          </div>
          <div className="text-[12px] text-fg-faint">By first report date · newest first</div>
        </div>
        <div className="flex flex-col gap-3">
          {digest.incidents.map((incident) => (
            <IncidentCard key={incident.incident_id} incident={incident} />
          ))}
        </div>
      </section>
    </>
  );
}
