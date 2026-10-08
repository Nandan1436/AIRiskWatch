const WIDTH = 110;
const HEIGHT = 36;

interface SparklineProps {
  values: number[];
  color: string;
  variant?: "area" | "bars";
}

/** Tiny decorative trend for stat cards. */
export function Sparkline({ values, color, variant = "area" }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);

  if (variant === "bars") {
    const slot = WIDTH / values.length;
    return (
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        {values.map((v, i) => {
          const h = Math.max(2, (v / max) * (HEIGHT - 3));
          return (
            <rect
              key={i}
              x={i * slot}
              y={HEIGHT - h}
              width={slot - 3}
              height={h}
              rx={2}
              fill={color}
              opacity={i === values.length - 1 ? 1 : 0.35}
            />
          );
        })}
      </svg>
    );
  }

  const step = WIDTH / (values.length - 1);
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(HEIGHT - 3 - (v / max) * (HEIGHT - 6)).toFixed(1)}`)
    .join(" ");
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT}Z`} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
