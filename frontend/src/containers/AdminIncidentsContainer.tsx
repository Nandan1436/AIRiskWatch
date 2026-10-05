import { useState } from "react";
import { Link } from "react-router-dom";
import { IncidentForm } from "../components/admin";
import styles from "../components/admin/AdminTable.module.css";
import { Button, ErrorMessage, LoadingSpinner, Pagination, TextField } from "../components/ui";
import { useDeleteIncident, useIncidentForm } from "../hooks/adminHooks";
import { useIncidentDetailQuery, useIncidentsQuery } from "../hooks/incidentHooks";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { IncidentDetail } from "../interfaces";

const PAGE_SIZE = 20;

// null = no form open, "new" = create form, a number = editing that incident.
type Editing = null | "new" | number;

export function AdminIncidentsContainer() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { incidents, total, isLoading, error } = useIncidentsQuery({
    limit: PAGE_SIZE,
    offset,
    search: debouncedSearch || undefined,
  });
  const { deleteIncident, isDeleting, error: deleteError } = useDeleteIncident();

  function handleDelete(incidentId: number, title: string | null) {
    const label = title ? `"${title}"` : `#${incidentId}`;
    if (window.confirm(`Delete incident ${label}? Its classification and report links are removed too.`)) {
      if (editing === incidentId) setEditing(null);
      deleteIncident(incidentId);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {editing === "new" && (
        <IncidentEditor incident={null} onClose={() => setEditing(null)} />
      )}
      {typeof editing === "number" && (
        <EditIncidentLoader key={editing} incidentId={editing} onClose={() => setEditing(null)} />
      )}

      <div>
        <div className={styles.toolbar}>
          <div className="w-full max-w-[360px]">
            <TextField
              label="Search incidents"
              name="incident-search"
              placeholder="Title or description"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <Button onClick={() => setEditing("new")} disabled={editing === "new"}>
            New incident
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
              {incidents.length === 0 ? (
                <div className={styles.empty}>No incidents found.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Classified</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr key={incident.incident_id}>
                        <td className={styles.mono}>{incident.incident_id}</td>
                        <td className={styles.titleCell}>
                          <Link to={`/incidents/${incident.incident_id}`} className={styles.truncate}>
                            {incident.title ?? "Untitled"}
                          </Link>
                        </td>
                        <td className={styles.mono}>{incident.incident_date ?? "—"}</td>
                        <td>
                          <span className={incident.classifications.length ? styles.pillAccent : styles.pill}>
                            {incident.classifications.length ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEditing(incident.incident_id)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              disabled={isDeleting}
                              onClick={() => handleDelete(incident.incident_id, incident.title)}
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

function EditIncidentLoader({ incidentId, onClose }: { incidentId: number; onClose: () => void }) {
  // The list endpoint omits the description, so editing loads the detail first.
  const { incident, isLoading, error } = useIncidentDetailQuery(incidentId);
  if (isLoading) return <LoadingSpinner />;
  if (error || !incident) return <ErrorMessage message={error ?? "Incident not found"} />;
  return <IncidentEditor incident={incident} onClose={onClose} />;
}

function IncidentEditor({ incident, onClose }: { incident: IncidentDetail | null; onClose: () => void }) {
  const { formData, setField, fieldErrors, onSubmit, generalError, isSubmitting } = useIncidentForm(
    incident,
    onClose,
  );
  return (
    <IncidentForm
      incidentId={incident?.incident_id ?? null}
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
