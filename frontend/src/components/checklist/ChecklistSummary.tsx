import { Card } from "../ui";
import type { Severity } from "../../utils/riskChecklist";
import styles from "./Checklist.module.css";

interface ChecklistSummaryProps {
  reviewed: number;
  total: number;
  matchCount: number;
  bySeverity: Record<Severity, number>;
}

export function ChecklistSummary({ reviewed, total, matchCount, bySeverity }: ChecklistSummaryProps) {
  const pct = total ? (reviewed / total) * 100 : 0;
  return (
    <Card title="Your checklist" description={`Generated from ${matchCount} similar incidents`}>
      <div className={styles.progressHead}>
        <span className={styles.big}>
          {reviewed} / {total}
        </span>
        <span>risks reviewed</span>
      </div>
      <div className={styles.progress}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.levels}>
        <span>
          <b className={styles.levelHigh}>{bySeverity.high}</b>High
        </span>
        <span>
          <b className={styles.levelMedium}>{bySeverity.medium}</b>Medium
        </span>
        <span>
          <b>{bySeverity.low}</b>Low
        </span>
      </div>
      <p className={styles.note}>
        Severity counts how many of the similar incidents fall in each category: high is 5 or more, medium 2–4.
      </p>
    </Card>
  );
}
