import { Link } from "react-router-dom";
import { AuthCard, AuthDivider, GoogleSignInButton } from "../components/auth";
import { Button, ErrorMessage, TextField } from "../components/ui";
import { GOOGLE_CLIENT_ID } from "../config/env";
import { useGoogleSignIn, useSignUp } from "../hooks/authHooks";

export function SignUpContainer() {
  const { formData, setFormData, fieldErrors, setFieldErrors, generalError, isSubmitting, onSubmit } =
    useSignUp();
  const google = useGoogleSignIn();
  const error = generalError ?? google.error;

  function handleChange(field: keyof typeof formData, value: string) {
    setFormData((data) => ({ ...data, [field]: value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="The site stays free to browse. An account lets you opt in to a monthly AI-risk summary email."
      footer={
        <>
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </>
      }
    >
      {GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton
            text="signup_with"
            onCredential={google.onCredential}
            onError={google.onGoogleError}
          />
          <AuthDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          value={formData.username}
          onChange={(e) => handleChange("username", e.target.value)}
          error={fieldErrors.username}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={fieldErrors.password}
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          error={fieldErrors.confirmPassword}
        />
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={isSubmitting || google.isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
