import type { FormEvent } from "react";
import type { ReportForm as ReportFormData } from "../../utils/adminValidation";
import type { FieldErrors } from "../../utils/validation";
import { Button, Card, ErrorMessage, TextAreaField, TextField } from "../ui";
import styles from "./AdminTable.module.css";

interface ReportFormProps {
  reportNumber: number | null;
  formData: ReportFormData;
  fieldErrors: FieldErrors<ReportFormData>;
  generalError: string | null;
  isSubmitting: boolean;
  onFieldChange: (field: keyof ReportFormData, value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function ReportForm({
  reportNumber,
  formData,
  fieldErrors,
  generalError,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onCancel,
}: ReportFormProps) {
  return (
    <Card
      title={reportNumber ? `Edit report #${reportNumber}` : "New report"}
      description="Linked incident ids replace the report's current links. Source domain is filled from the URL when left blank."
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
        <TextField
          label="URL"
          name="url"
          type="url"
          value={formData.url}
          onChange={(e) => onFieldChange("url", e.target.value)}
          error={fieldErrors.url}
        />
        <TextField
          label="Source domain"
          name="source_domain"
          value={formData.source_domain}
          onChange={(e) => onFieldChange("source_domain", e.target.value)}
          error={fieldErrors.source_domain}
        />
        <TextField
          label="Authors"
          name="authors"
          value={formData.authors}
          onChange={(e) => onFieldChange("authors", e.target.value)}
          error={fieldErrors.authors}
        />
        <TextField
          label="Published date"
          name="published_date"
          type="date"
          value={formData.published_date}
          onChange={(e) => onFieldChange("published_date", e.target.value)}
          error={fieldErrors.published_date}
        />
        <TextField
          label="Language"
          name="language"
          value={formData.language}
          onChange={(e) => onFieldChange("language", e.target.value)}
          error={fieldErrors.language}
        />
        <TextField
          label="Linked incident ids (comma-separated)"
          name="incident_ids"
          value={formData.incident_ids}
          onChange={(e) => onFieldChange("incident_ids", e.target.value)}
          error={fieldErrors.incident_ids}
        />
        <div className={styles.fullWidth}>
          <TextAreaField
            label="Article text"
            name="text"
            rows={6}
            value={formData.text}
            onChange={(e) => onFieldChange("text", e.target.value)}
            error={fieldErrors.text}
          />
        </div>
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
            {isSubmitting ? "Saving…" : reportNumber ? "Save changes" : "Create report"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
