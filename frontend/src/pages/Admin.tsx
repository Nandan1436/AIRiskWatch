import type { ReactNode } from "react";
import { AdminTabs } from "../components/admin";
import { PageHeader } from "../components/layout";
import {
  AdminIncidentsContainer,
  AdminIngestionContainer,
  AdminReportsContainer,
  AdminUsersContainer,
} from "../containers";

export type AdminSection = "users" | "ingestion" | "incidents" | "reports";

const SECTIONS: Record<AdminSection, { subtitle: string; content: ReactNode }> = {
  users: { subtitle: "Manage roles and account access", content: <AdminUsersContainer /> },
  ingestion: { subtitle: "Trigger a news ingestion run", content: <AdminIngestionContainer /> },
  incidents: { subtitle: "Create, edit and delete incidents", content: <AdminIncidentsContainer /> },
  reports: { subtitle: "Create, edit and delete source reports", content: <AdminReportsContainer /> },
};

export function Admin({ section }: { section: AdminSection }) {
  const { subtitle, content } = SECTIONS[section];
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHeader title="Admin" subtitle={subtitle} />
      <div className="max-w-[1240px] px-10 pb-16 pt-8">
        <AdminTabs />
        {content}
      </div>
    </div>
  );
}
