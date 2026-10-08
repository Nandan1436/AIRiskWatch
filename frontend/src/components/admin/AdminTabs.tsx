import { NavLink } from "react-router-dom";
import { Mail, Newspaper, Rss, TriangleAlert, Users } from "lucide-react";
import styles from "./AdminTable.module.css";

const TABS = [
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Ingestion", to: "/admin/ingestion", icon: Rss },
  { label: "Incidents", to: "/admin/incidents", icon: TriangleAlert },
  { label: "Reports", to: "/admin/reports", icon: Newspaper },
  { label: "Digest", to: "/admin/digest", icon: Mail },
];

export function AdminTabs() {
  return (
    <nav className={styles.tabs}>
      {TABS.map(({ label, to, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}>
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
