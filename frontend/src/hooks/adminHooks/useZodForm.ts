import { useState, type FormEvent } from "react";
import { ZodError, type ZodType } from "zod";
import { getFieldErrors, type FieldErrors } from "../../utils/validation";

// Shared state for the admin create/edit forms, in the doc 05 form-hook shape.
export function useZodForm<TForm extends Record<string, string>>(
  schema: ZodType<TForm>,
  initial: TForm,
  submit: (form: TForm) => void,
) {
  const [formData, setFormData] = useState<TForm>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TForm>>({});

  function setField(field: keyof TForm, value: string) {
    setFormData((data) => ({ ...data, [field]: value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const parsed = schema.parse(formData);
      setFieldErrors({});
      submit(parsed);
    } catch (error) {
      if (error instanceof ZodError) setFieldErrors(getFieldErrors<TForm>(error));
      else throw error;
    }
  }

  return { formData, setField, fieldErrors, onSubmit };
}
