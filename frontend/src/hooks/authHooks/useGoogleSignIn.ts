import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { signInWithGoogle } from "../../services/authService";
import { useAuthRedirect } from "./useAuthRedirect";

export function useGoogleSignIn() {
  const completeSignIn = useAuthRedirect();
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: completeSignIn,
    onError: (err: Error) => setError(err.message),
  });

  return {
    onCredential: (credential: string | undefined) => {
      setError(null);
      if (credential) mutate(credential);
      else setError("Google did not return a credential");
    },
    onGoogleError: () => setError("Google sign-in was cancelled or failed"),
    error,
    isSubmitting: isPending,
  };
}
