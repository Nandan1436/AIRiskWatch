import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Card, ErrorMessage, LoadingSpinner } from "../components/ui";
import { useDigestAdmin } from "../hooks/adminHooks";
import { useDigestMonths } from "../hooks";
import { formatDigestMonth, toYearMonth } from "../utils/digestMonth";

export function AdminDigestContainer() {
  const { user } = useAuth();
  const { months, isLoading, error: monthsError } = useDigestMonths();
  const [selected, setSelected] = useState<string>();
  const month = selected ?? (months[0] ? toYearMonth(months[0].month) : undefined);
  const digest = useDigestAdmin(month);

  if (isLoading) return <LoadingSpinner />;
  if (monthsError) return <ErrorMessage message={monthsError} />;

  const monthLabel = month ? formatDigestMonth(`${month}-01`) : "";

  function handleSendAll() {
    if (window.confirm(`Send the ${monthLabel} digest to all subscribers? Users who already received it are skipped.`)) {
      digest.sendAll();
    }
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <Card
        title="Monthly digest email"
        description="Sent automatically on the 1st when DIGEST_EMAIL_ENABLED is on, to active non-admin users with digest emails turned on. Each user receives a month's digest at most once; failed sends are retried on the next run."
      >
        <div className="flex flex-col gap-5">
          <label className="flex items-center gap-3 text-[13px] text-fg-dim">
            Month
            <select
              value={month ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-[10px] border px-3 py-[7px] text-[13px] text-fg"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              {months.map((m) => (
                <option key={m.month} value={toYearMonth(m.month)}>
                  {formatDigestMonth(m.month)} ({m.total} incidents)
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={digest.preview} disabled={!month || digest.isPreviewing}>
              {digest.isPreviewing ? "Loading…" : "Preview email"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => user && digest.sendTest(user.email)}
              disabled={!month || !user || digest.isSending}
            >
              Send test to me
            </Button>
            <Button onClick={handleSendAll} disabled={!month || digest.isSending}>
              {digest.isSending ? "Sending…" : "Send to all subscribers"}
            </Button>
          </div>

          {digest.lastSend && (
            <p className="text-[12.5px]" style={{ color: "var(--down)" }}>
              {digest.lastSend.test_to
                ? `Test email sent to ${digest.lastSend.test_to}.`
                : "Sending started in the background. Refresh the status below to follow progress."}
            </p>
          )}
        </div>
      </Card>

      {digest.status && (
        <Card title={`Delivery status · ${monthLabel}`}>
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-fg-dim">
            <span>
              Subscribers <span className="font-mono font-semibold text-fg">{digest.status.subscribers}</span>
            </span>
            <span>
              Sent <span className="font-mono font-semibold text-fg">{digest.status.sent}</span>
            </span>
            <span>
              Failed <span className="font-mono font-semibold text-fg">{digest.status.failed}</span>
            </span>
            <span>
              Pending <span className="font-mono font-semibold text-fg">{digest.status.pending}</span>
            </span>
            <Button variant="secondary" onClick={digest.refreshStatus} disabled={digest.isRefreshing}>
              {digest.isRefreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </Card>
      )}

      {digest.error && <ErrorMessage message={digest.error} />}
    </div>
  );
}
