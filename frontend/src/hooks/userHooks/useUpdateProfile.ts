import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ZodError } from "zod";
import { useAuth } from "../../context/AuthContext";
import type { User, UserUpdateRequest } from "../../interfaces";
import { updateCurrentUser } from "../../services/userService";
import { ProfileSchema, type ProfileForm } from "../../utils/authValidation";
import { getFieldErrors, type FieldErrors } from "../../utils/validation";

export function useUpdateProfile(user: User) {
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState<ProfileForm>({ username: user.username });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileForm>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (request: UserUpdateRequest) => updateCurrentUser(request),
    onSuccess: (updated) => {
      updateUser(updated);
      setFormData({ username: updated.username });
      setSavedMessage("Saved");
    },
    onError: (error: Error) => setGeneralError(error.message),
  });

  function save(request: UserUpdateRequest) {
    setGeneralError(null);
    setSavedMessage(null);
    mutate(request);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const { username } = ProfileSchema.parse(formData);
      setFieldErrors({});
      save({ username });
    } catch (error) {
      if (error instanceof ZodError) setFieldErrors(getFieldErrors<ProfileForm>(error));
      else setGeneralError("Unexpected error");
    }
  }

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    generalError,
    savedMessage,
    isSubmitting: isPending,
    onSubmit,
    setEmailNotifications: (enabled: boolean) => save({ email_notifications: enabled }),
    isDirty: formData.username.trim() !== user.username,
  };
}
