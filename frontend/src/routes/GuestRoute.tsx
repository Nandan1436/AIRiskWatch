import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from?.pathname;
    return <Navigate to={from ?? "/incidents"} replace />;
  }
  return <Outlet />;
}
