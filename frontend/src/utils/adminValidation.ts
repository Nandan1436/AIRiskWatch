import { z } from "zod";
import type { IncidentWriteRequest, ReportWriteRequest } from "../interfaces";

// Admin forms edit list fields as comma-separated text.
export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(values: (string | number)[] | null | undefined): string {
  return (values ?? []).join(", ");
}

const optionalText = z.string().trim();
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD");

export const IncidentFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalText,
  incident_date: optionalDate,
  alleged_deployer: optionalText,
  alleged_developer: optionalText,
  harmed_parties: optionalText,
});

export const ReportFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  text: optionalText,
  url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Enter a full http(s) URL"),
  source_domain: optionalText,
  authors: optionalText,
  published_date: optionalDate,
  language: optionalText,
  incident_ids: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+(\s*,\s*\d+)*$/.test(v), "Comma-separated incident ids"),
});

export type IncidentForm = z.infer<typeof IncidentFormSchema>;
export type ReportForm = z.infer<typeof ReportFormSchema>;

export function toIncidentRequest(form: IncidentForm): IncidentWriteRequest {
  return {
    title: form.title,
    description: form.description || null,
    incident_date: form.incident_date || null,
    alleged_deployer: splitList(form.alleged_deployer),
    alleged_developer: splitList(form.alleged_developer),
    harmed_parties: splitList(form.harmed_parties),
  };
}

export function toReportRequest(form: ReportForm): ReportWriteRequest {
  return {
    title: form.title,
    text: form.text || null,
    url: form.url || null,
    source_domain: form.source_domain || null,
    authors: form.authors || null,
    published_date: form.published_date || null,
    language: form.language || null,
    incident_ids: splitList(form.incident_ids).map(Number),
  };
}
