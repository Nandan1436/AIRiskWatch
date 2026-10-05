import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ZodError } from "zod";
import { signUp } from "../../services/authService";
import { SignUpSchema, type SignUpForm } from "../../utils/authValidation";
import { getFieldErrors, type FieldErrors } from "../../utils/validation";
import { useAuthRedirect } from "./useAuthRedirect";

export function useSignUp() {
  const completeSignUp = useAuthRedirect();
  const [formData, setFormData] = useState<SignUpForm>({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignUpForm>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: signUp,
    onSuccess: completeSignUp,
    onError: (error: Error) => setGeneralError(error.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    try {
      const { email, username, password } = SignUpSchema.parse(formData);
      setFieldErrors({});
      mutate({ email, username, password });
    } catch (error) {
      if (error instanceof ZodError) setFieldErrors(getFieldErrors<SignUpForm>(error));
      else setGeneralError("Unexpected error");
    }
  }

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    generalError,
    isSubmitting: isPending,
    onSubmit,
  };
}
