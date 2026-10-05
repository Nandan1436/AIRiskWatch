import { Routes, Route, Navigate } from "react-router-dom";
import {
  AccountPage,
  AdminPage,
  IncidentDetailPage,
  IncidentListPage,
  SearchPage,
  SignInPage,
  SignUpPage,
} from "../pages";
import { AdminRoute } from "./AdminRoute";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/incidents" replace />} />
      <Route path="/incidents" element={<IncidentListPage />} />
      <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      <Route path="/search" element={<SearchPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<AccountPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminPage section="users" />} />
        <Route path="/admin/ingestion" element={<AdminPage section="ingestion" />} />
        <Route path="/admin/incidents" element={<AdminPage section="incidents" />} />
        <Route path="/admin/reports" element={<AdminPage section="reports" />} />
      </Route>

      <Route path="*" element={<Navigate to="/incidents" replace />} />
    </Routes>
  );
}
