import { useTheme } from "../../context/ThemeContext";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  {
    label: "Incidents",
    active: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    label: "Risk domains",
    active: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="7" />
        <rect x="12" y="6" width="3" height="11" />
        <rect x="17" y="13" width="3" height="4" />
      </svg>
    ),
  },
  {
    label: "Source reports",
    active: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { theme, setTheme } = useTheme();

  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className={styles.brandName}>AIRiskWatch</div>
          <div className={styles.brandSub}>Incident intelligence</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={item.active ? styles.navItemActive : styles.navItem}
            title={item.active ? undefined : "Coming soon"}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className={styles.appearance}>
        <div className={styles.appearanceLabel}>Appearance</div>
        <div className={styles.toggleTrack}>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={theme === "light" ? styles.toggleBtnActive : styles.toggleBtn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
            </svg>
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={theme === "dark" ? styles.toggleBtnActive : styles.toggleBtn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            Dark
          </button>
        </div>
      </div>
    </aside>
  );
}
