import { Link, useLocation, type Location } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "./IncidentDetailHeader.module.css";

const SECTION_LABELS: [pattern: RegExp, label: string][] = [
  [/^\/$/, "overview"],
  [/^\/incidents\/\d+/, "previous incident"],
  [/^\/incidents/, "incidents"],
  [/^\/search/, "search results"],
  [/^\/taxonomy/, "taxonomy"],
  [/^\/digest/, "digest"],
  [/^\/admin/, "admin"],
];

/** Returns to the page (and filters/page number) the user came from, else the incident list. */
export function BackLink() {
  const from = (useLocation().state as { from?: Location } | null)?.from;
  const to = from ? `${from.pathname}${from.search}` : "/incidents";
  const label = from
    ? (SECTION_LABELS.find(([pattern]) => pattern.test(from.pathname))?.[1] ?? "previous page")
    : "incidents";

  return (
    <Link to={to} className={styles.back}>
      <ArrowLeft />
      Back to {label}
    </Link>
  );
}
