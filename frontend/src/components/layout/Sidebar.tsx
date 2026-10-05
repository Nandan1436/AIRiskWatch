import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  {
    label: "Incidents",
    to: "/incidents",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Search",
    to: "/search",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Risk domains",
    to: null,
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
    to: null,
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

const ADMIN_NAV_ITEM = {
  label: "Admin",
  to: "/admin",
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
};

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  function handleSignOut() {
    logout();
    navigate("/incidents");
  }

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
        {navItems.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className={
                location.pathname.startsWith(item.to)
                  ? styles.navItemActive
                  : styles.navItem
              }
            >
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <div
              key={item.label}
              className={styles.navItem}
              title="Coming soon"
            >
              {item.icon}
              {item.label}
            </div>
          ),
        )}
      </nav>

      <div className={styles.account}>
        {isAuthenticated && user ? (
          <>
            <Link
              to="/account"
              className={
                location.pathname.startsWith("/account")
                  ? styles.accountCardActive
                  : styles.accountCard
              }
            >
              <span className={styles.avatar}>{user.username.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 leading-tight">
                <span className={styles.accountName}>{user.username}</span>
                <span className={styles.accountEmail}>{user.email}</span>
              </span>
            </Link>
            <button type="button" onClick={handleSignOut} className={styles.signOut}>
              Sign out
            </button>
          </>
        ) : (
          !isLoading && (
            <Link to="/sign-in" state={{ from: location }} className={styles.signIn}>
              Sign in
            </Link>
          )
        )}
      </div>

      <div className={styles.appearance}>
        <div className={styles.appearanceLabel}>Appearance</div>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeToggle}
          data-theme={theme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-pressed={theme === "dark"}
        >
          <svg className={styles.themeToggleIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
          </svg>
          <svg className={styles.themeToggleIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className={styles.themeToggleThumb} />
        </button>
      </div>
    </aside>
  );
}
