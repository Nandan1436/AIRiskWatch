import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IncidentTrendPoint } from "../../interfaces";

interface IncidentTrendChartProps {
  trend: IncidentTrendPoint[];
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: IncidentTrendPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const { year, count } = payload[0].payload;
  return (
    <div
      className="rounded-[10px] px-[11px] py-[7px]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <div className="font-mono text-[11px] text-fg-faint">{year}</div>
      <div className="font-mono text-[14px] font-bold tabular-nums text-fg">
        {count} incidents
      </div>
    </div>
  );
}

export function IncidentTrendChart({ trend }: IncidentTrendChartProps) {
  const firstYear = trend[0]?.year;
  // The current calendar year is still in progress, so comparing it against
  // a full prior year would read as a misleading drop — compare the last
  // two *complete* years instead.
  const currentYear = new Date().getFullYear();
  const completeYears = trend.filter((p) => p.year < currentYear);
  const lastYear = completeYears[completeYears.length - 1];
  const priorYear = completeYears[completeYears.length - 2];
  const yoyChange =
    priorYear && priorYear.count > 0 && lastYear
      ? (((lastYear.count - priorYear.count) / priorYear.count) * 100).toFixed(0)
      : null;

  return (
    <div
      className="rounded-[18px] border p-[22px_24px]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-0.5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold tracking-tight text-fg">
          Incident volume over time
        </h3>
        {yoyChange !== null && (
          <span className="font-mono text-[11px] font-semibold text-green">
            {Number(yoyChange) >= 0 ? "+" : ""}
            {yoyChange}% YoY
          </span>
        )}
      </div>
      <p className="mb-4 text-[12.5px] text-fg-dim">
        {firstYear ? `Reported incidents by year since ${firstYear}.` : "Reported incidents by year."}
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tickLine={false}
            interval={Math.max(0, Math.ceil(trend.length / 7) - 1)}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#trendArea)"
            activeDot={{ r: 4.5, fill: "var(--surface)", stroke: "var(--accent)", strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
