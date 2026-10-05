import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ZodError } from "zod";
import { signIn } from "../../services/authService";
import { SignInSchema, type SignInForm } from "../../utils/authValidation";
import { getFieldErrors, type FieldErrors } from "../../utils/validation";
import { useAuthRedirect } from "./useAuthRedirect";

export function useSignIn() {
  const completeSignIn = useAuthRedirect();
  const [formData, setFormData] = useState<SignInForm>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignInForm>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: signIn,
    onSuccess: completeSignIn,
    onError: (error: Error) => setGeneralError(error.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    try {
      const request = SignInSchema.parse(formData);
      setFieldErrors({});
      mutate(request);
    } catch (error) {
      if (error instanceof ZodError) setFieldErrors(getFieldErrors<SignInForm>(error));
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
