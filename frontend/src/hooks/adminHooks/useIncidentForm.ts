import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IncidentDetail } from "../../interfaces";
import { createIncident, updateIncident } from "../../services/adminService";
import {
  IncidentFormSchema,
  joinList,
  toIncidentRequest,
  type IncidentForm,
} from "../../utils/adminValidation";
import { useZodForm } from "./useZodForm";

function toForm(incident: IncidentDetail | null): IncidentForm {
  return {
    title: incident?.title ?? "",
    description: incident?.description ?? "",
    incident_date: incident?.incident_date ?? "",
    alleged_deployer: joinList(incident?.alleged_deployer),
    alleged_developer: joinList(incident?.alleged_developer),
    harmed_parties: joinList(incident?.harmed_parties),
  };
}

// Creates a new incident when incident is null, otherwise edits it.
export function useIncidentForm(incident: IncidentDetail | null, onSaved: () => void) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (form: IncidentForm) =>
      incident
        ? updateIncident(incident.incident_id, toIncidentRequest(form))
        : createIncident(toIncidentRequest(form)),
    onSuccess: (saved) => {
      queryClient.setQueryData(["incident-detail", saved.incident_id], saved);
      // Incidents feed the list, charts and summary cards, so refresh them all.
      queryClient.invalidateQueries();
      onSaved();
    },
  });
  const form = useZodForm(IncidentFormSchema, toForm(incident), (data) => mutate(data));

  return {
    ...form,
    generalError: error ? (error as Error).message : null,
    isSubmitting: isPending,
  };
}
