import type { ReactNode } from "react";
import { AdminTabs } from "../components/admin";
import { PageHead } from "../components/layout";
import {
  AdminDigestContainer,
  AdminIncidentsContainer,
  AdminIngestionContainer,
  AdminReportsContainer,
  AdminUsersContainer,
} from "../containers";

export type AdminSection = "users" | "ingestion" | "incidents" | "reports" | "digest";

const SECTIONS: Record<AdminSection, { label: string; content: ReactNode }> = {
  users: { label: "Users", content: <AdminUsersContainer /> },
  ingestion: { label: "Ingestion", content: <AdminIngestionContainer /> },
  incidents: { label: "Incidents", content: <AdminIncidentsContainer /> },
  reports: { label: "Reports", content: <AdminReportsContainer /> },
  digest: { label: "Digest", content: <AdminDigestContainer /> },
};

export function Admin({ section }: { section: AdminSection }) {
  const { label, content } = SECTIONS[section];
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHead
        crumbs={[{ label: "Home", to: "/" }, { label: "Admin", to: "/admin" }, { label }]}
        eyebrow="Administration"
        title="Admin console"
        description="Manage users, run ingestion, curate incidents and reports, and send the monthly digest."
      />
      <AdminTabs />
      {content}
    </div>
  );
}
