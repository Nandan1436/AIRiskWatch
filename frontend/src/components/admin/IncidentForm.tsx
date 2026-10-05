import type { FormEvent } from "react";
import type { IncidentForm as IncidentFormData } from "../../utils/adminValidation";
import type { FieldErrors } from "../../utils/validation";
import { Button, Card, ErrorMessage, TextAreaField, TextField } from "../ui";
import styles from "./AdminTable.module.css";

interface IncidentFormProps {
  incidentId: number | null;
  formData: IncidentFormData;
  fieldErrors: FieldErrors<IncidentFormData>;
  generalError: string | null;
  isSubmitting: boolean;
  onFieldChange: (field: keyof IncidentFormData, value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function IncidentForm({
  incidentId,
  formData,
  fieldErrors,
  generalError,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onCancel,
}: IncidentFormProps) {
  return (
    <Card
      title={incidentId ? `Edit incident #${incidentId}` : "New incident"}
      description="Title and description are re-embedded on save so semantic search stays accurate. New incidents start unclassified."
    >
      <form onSubmit={onSubmit} className={styles.formGrid} noValidate>
        <div className={styles.fullWidth}>
          <TextField
            label="Title"
            name="title"
            value={formData.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            error={fieldErrors.title}
          />
        </div>
        <div className={styles.fullWidth}>
          <TextAreaField
            label="Description"
            name="description"
            value={formData.description}
            onChange={(e) => onFieldChange("description", e.target.value)}
            error={fieldErrors.description}
          />
        </div>
        <TextField
          label="Incident date"
          name="incident_date"
          type="date"
          value={formData.incident_date}
          onChange={(e) => onFieldChange("incident_date", e.target.value)}
          error={fieldErrors.incident_date}
        />
        <TextField
          label="Alleged deployers (comma-separated)"
          name="alleged_deployer"
          value={formData.alleged_deployer}
          onChange={(e) => onFieldChange("alleged_deployer", e.target.value)}
          error={fieldErrors.alleged_deployer}
        />
        <TextField
          label="Alleged developers (comma-separated)"
          name="alleged_developer"
          value={formData.alleged_developer}
          onChange={(e) => onFieldChange("alleged_developer", e.target.value)}
          error={fieldErrors.alleged_developer}
        />
        <TextField
          label="Harmed parties (comma-separated)"
          name="harmed_parties"
          value={formData.harmed_parties}
          onChange={(e) => onFieldChange("harmed_parties", e.target.value)}
          error={fieldErrors.harmed_parties}
        />
        {generalError && (
          <div className={styles.fullWidth}>
            <ErrorMessage message={generalError} />
          </div>
        )}
        <div className={`${styles.fullWidth} flex justify-end gap-2`}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : incidentId ? "Save changes" : "Create incident"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
