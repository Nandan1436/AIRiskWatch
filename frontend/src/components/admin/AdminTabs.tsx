import { NavLink } from "react-router-dom";
import styles from "./AdminTable.module.css";

const TABS = [
  { label: "Users", to: "/admin/users" },
  { label: "Ingestion", to: "/admin/ingestion" },
  { label: "Incidents", to: "/admin/incidents" },
  { label: "Reports", to: "/admin/reports" },
];

export function AdminTabs() {
  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
