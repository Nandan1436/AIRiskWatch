import { Routes, Route, Navigate } from "react-router-dom";
import { IncidentListPage, IncidentDetailPage, SearchPage } from "../pages";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/incidents" replace />} />
      <Route path="/incidents" element={<IncidentListPage />} />
      <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="*" element={<Navigate to="/incidents" replace />} />
    </Routes>
  );
}
