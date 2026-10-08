import { Link } from "react-router-dom";
import { AuthCard, AuthDivider, GoogleSignInButton } from "../components/auth";
import { Button, ErrorMessage, TextField } from "../components/ui";
import { GOOGLE_CLIENT_ID } from "../config/env";
import { useGoogleSignIn, useSignIn } from "../hooks/authHooks";

export function SignInContainer() {
  const { formData, setFormData, fieldErrors, setFieldErrors, generalError, isSubmitting, onSubmit } =
    useSignIn();
  const google = useGoogleSignIn();
  const error = generalError ?? google.error;

  function handleChange(field: keyof typeof formData, value: string) {
    setFormData((data) => ({ ...data, [field]: value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to AIRiskWatch."
      footer={
        <>
          No account yet? <Link to="/sign-up">Create one</Link>
        </>
      }
    >
      {GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton
            text="signin_with"
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
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={fieldErrors.password}
        />
        {error && <ErrorMessage message={error} />}
        <Button type="submit" block disabled={isSubmitting || google.isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
