import { Routes, Route, Navigate } from "react-router-dom";
import { IncidentListPage, IncidentDetailPage } from "../pages";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/incidents" replace />} />
      <Route path="/incidents" element={<IncidentListPage />} />
      <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      <Route path="*" element={<Navigate to="/incidents" replace />} />
    </Routes>
  );
}
