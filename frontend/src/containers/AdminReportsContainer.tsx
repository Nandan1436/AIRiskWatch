import { useState } from "react";
import { ReportForm } from "../components/admin";
import styles from "../components/admin/AdminTable.module.css";
import { Button, ErrorMessage, LoadingSpinner, Pagination, TextField } from "../components/ui";
import {
  useAdminReportQuery,
  useAdminReportsQuery,
  useDeleteReport,
  useReportForm,
} from "../hooks/adminHooks";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { AdminReportDetail } from "../interfaces";

const PAGE_SIZE = 20;

// null = no form open, "new" = create form, a number = editing that report.
type Editing = null | "new" | number;

export function AdminReportsContainer() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { reports, total, isLoading, error } = useAdminReportsQuery({
    limit: PAGE_SIZE,
    offset,
    search: debouncedSearch || undefined,
  });
  const { deleteReport, isDeleting, error: deleteError } = useDeleteReport();

  function handleDelete(reportNumber: number, title: string | null) {
    const label = title ? `"${title}"` : `#${reportNumber}`;
    if (window.confirm(`Delete report ${label}? It is unlinked from its incidents.`)) {
      if (editing === reportNumber) setEditing(null);
      deleteReport(reportNumber);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {editing === "new" && <ReportEditor report={null} onClose={() => setEditing(null)} />}
      {typeof editing === "number" && (
        <EditReportLoader key={editing} reportNumber={editing} onClose={() => setEditing(null)} />
      )}

      <div>
        <div className={styles.toolbar}>
          <div className="w-full max-w-[360px]">
            <TextField
              label="Search reports"
              name="report-search"
              placeholder="Title or URL"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <Button onClick={() => setEditing("new")} disabled={editing === "new"}>
            New report
          </Button>
        </div>
        {deleteError && (
          <div className="mb-4">
            <ErrorMessage message={deleteError} />
          </div>
        )}
        {isLoading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {!isLoading && !error && (
          <>
            <div className={styles.tableWrap}>
              {reports.length === 0 ? (
                <div className={styles.empty}>No reports found.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Title</th>
                      <th>Source</th>
                      <th>Published</th>
                      <th>Incidents</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.report_number}>
                        <td className={styles.mono}>{report.report_number}</td>
                        <td className={styles.titleCell}>
                          {report.url ? (
                            <a href={report.url} target="_blank" rel="noreferrer" className={styles.truncate}>
                              {report.title ?? "Untitled"}
                            </a>
                          ) : (
                            <span className={styles.truncate}>{report.title ?? "Untitled"}</span>
                          )}
                        </td>
                        <td className={styles.dim}>{report.source_domain ?? "—"}</td>
                        <td className={styles.mono}>{report.published_date ?? "—"}</td>
                        <td className={styles.mono}>
                          {report.incident_ids.length ? report.incident_ids.join(", ") : "—"}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEditing(report.report_number)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              disabled={isDeleting}
                              onClick={() => handleDelete(report.report_number, report.title)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination offset={offset} limit={PAGE_SIZE} total={total} onOffsetChange={setOffset} />
          </>
        )}
      </div>
    </div>
  );
}

function EditReportLoader({ reportNumber, onClose }: { reportNumber: number; onClose: () => void }) {
  // The list omits the article text, so editing loads the detail first.
  const { report, isLoading, error } = useAdminReportQuery(reportNumber);
  if (isLoading) return <LoadingSpinner />;
  if (error || !report) return <ErrorMessage message={error ?? "Report not found"} />;
  return <ReportEditor report={report} onClose={onClose} />;
}

function ReportEditor({ report, onClose }: { report: AdminReportDetail | null; onClose: () => void }) {
  const { formData, setField, fieldErrors, onSubmit, generalError, isSubmitting } = useReportForm(
    report,
    onClose,
  );
  return (
    <ReportForm
      reportNumber={report?.report_number ?? null}
      formData={formData}
      fieldErrors={fieldErrors}
      generalError={generalError}
      isSubmitting={isSubmitting}
      onFieldChange={setField}
      onSubmit={onSubmit}
      onCancel={onClose}
    />
  );
}
