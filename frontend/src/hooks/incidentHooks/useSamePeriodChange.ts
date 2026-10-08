import type { ClassificationFilters } from "../../interfaces";
import { useIncidentCountQuery } from "./useIncidentQuery";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Incidents so far this year vs the same period last year, for the given filters. */
export function useSamePeriodChange(filters: ClassificationFilters) {
  const today = new Date();
  const year = today.getFullYear();
  const lastYearToday = new Date(today);
  lastYearToday.setFullYear(year - 1);

  const current = useIncidentCountQuery({ ...filters, date_from: `${year}-01-01`, date_to: isoDate(today) });
  const previous = useIncidentCountQuery({
    ...filters,
    date_from: `${year - 1}-01-01`,
    date_to: isoDate(lastYearToday),
  });

  const pct =
    current.count !== undefined && previous.count
      ? Math.round(((current.count - previous.count) / previous.count) * 100)
      : null;
  return { year, current: current.count, previous: previous.count, pct };
}
