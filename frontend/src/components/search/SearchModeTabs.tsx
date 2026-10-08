import { NavLink } from "react-router-dom";
import { ListChecks, Sparkles } from "lucide-react";
import styles from "./Search.module.css";

export function SearchModeTabs() {
  return (
    <nav className={styles.modes} aria-label="Search mode">
      <NavLink to="/search" end className={({ isActive }) => (isActive ? styles.modeActive : styles.mode)}>
        <Sparkles />
        Find incidents
      </NavLink>
      <NavLink to="/search/checklist" className={({ isActive }) => (isActive ? styles.modeActive : styles.mode)}>
        <ListChecks />
        Risk checklist
      </NavLink>
    </nav>
  );
}
