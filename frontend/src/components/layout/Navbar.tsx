import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Moon,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import styles from "./Navbar.module.css";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, end: true },
  { label: "Incidents", to: "/incidents", icon: List },
  { label: "Search", to: "/search", icon: Sparkles },
  { label: "Taxonomy", to: "/taxonomy", icon: Network },
];

// Shown only to signed-in users.
const DIGEST_ITEM: NavItem = { label: "Digest", to: "/digest", icon: Mail };
const ADMIN_ITEM: NavItem = { label: "Admin", to: "/admin", icon: ShieldCheck };

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const items = [
    ...NAV_ITEMS,
    ...(isAuthenticated ? [DIGEST_ITEM] : []),
    ...(isAdmin ? [ADMIN_ITEM] : []),
  ];

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  // Ctrl/Cmd+K focuses the navbar search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    searchRef.current?.blur();
  }

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const links = items.map(({ label, to, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
    >
      <Icon />
      {label}
    </NavLink>
  ));

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logo}>
            <Radar />
          </span>
          AIRiskWatch
        </Link>

        <div className={styles.links}>{links}</div>

        <div className={styles.right}>
          <form className={styles.search} onSubmit={handleSearch} role="search">
            <Search />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search incidents"
            />
            <kbd>Ctrl K</kbd>
          </form>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title="Toggle theme"
          >
            <ThemeIcon />
          </button>
          {isAuthenticated && user ? (
            <Link to="/account" className={styles.avatar} title={`${user.username} · account`}>
              {user.username.charAt(0).toUpperCase()}
            </Link>
          ) : (
            !isLoading && (
              <Link to="/sign-in" state={{ from: location }} className={styles.signIn}>
                <LogIn />
                <span>Sign in</span>
              </Link>
            )
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.menuBtn}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <form className={styles.mobileSearch} onSubmit={handleSearch} role="search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search incidents…"
              aria-label="Search incidents"
            />
          </form>
          <div className={styles.mobileLinks}>{links}</div>
          {isAuthenticated && (
            <button type="button" className={styles.mobileSignOut} onClick={handleSignOut}>
              <LogOut />
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
