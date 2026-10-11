import { Routes, Route, Navigate } from "react-router-dom";
import {
  AccountPage,
  AdminPage,
  IncidentDetailPage,
  IncidentListPage,
  MonthlyDigestPage,
  OverviewPage,
  SearchPage,
  SignInPage,
  SignUpPage,
  TaxonomyCausalPage,
  TaxonomyDomainPage,
  TaxonomyPage,
  TaxonomySubdomainPage,
} from "../pages";
import { AdminRoute } from "./AdminRoute";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { ScrollToTop } from "./ScrollToTop";

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/incidents" element={<IncidentListPage />} />
        <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/taxonomy" element={<TaxonomyPage />} />
        <Route path="/taxonomy/domain/:domainNumber" element={<TaxonomyDomainPage />} />
        <Route path="/taxonomy/subdomain/:code" element={<TaxonomySubdomainPage />} />
        <Route path="/taxonomy/causal/:dimension/:slug" element={<TaxonomyCausalPage />} />

        <Route element={<GuestRoute />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/digest" element={<MonthlyDigestPage />} />
          <Route path="/digest/:yearMonth" element={<MonthlyDigestPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<AdminPage section="users" />} />
          <Route path="/admin/ingestion" element={<AdminPage section="ingestion" />} />
          <Route path="/admin/incidents" element={<AdminPage section="incidents" />} />
          <Route path="/admin/reports" element={<AdminPage section="reports" />} />
          <Route path="/admin/digest" element={<AdminPage section="digest" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
