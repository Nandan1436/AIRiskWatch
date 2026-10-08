import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { YearValue } from "./YearBars";
import styles from "./Charts.module.css";

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: YearValue }[] }) {
  if (!active || !payload?.length) return null;
  const { year, value } = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div>{year}</div>
      <div>{value.toLocaleString()} incidents</div>
    </div>
  );
}

export function TrendAreaChart({ points, height = 240 }: { points: YearValue[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--fg-faint)", fontSize: 11, fontFamily: "JetBrains Mono" }}
          minTickGap={18}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--fg-faint)", fontSize: 11 }}
          allowDecimals={false}
          width={48}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--accent)"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          activeDot={{ r: 5, fill: "var(--bg)", stroke: "var(--accent)", strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
