import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { AuthResponse } from "../../interfaces";

// Stores the session, then returns to the page that sent the user to sign in.
export function useAuthRedirect() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  return (auth: AuthResponse) => {
    login(auth);
    navigate(from ?? "/", { replace: true });
  };
}
