import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config/env";
import styles from "./Layout.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>AIRiskWatch · data from the MIT AI Risk Repository and daily news</span>
        <span className={styles.footerLinks}>
          <Link to="/taxonomy">Taxonomy</Link>
          <a href="https://airisk.mit.edu/" target="_blank" rel="noreferrer">
            MIT AI Risk Repository
          </a>
          <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
            API docs
          </a>
        </span>
      </div>
    </footer>
  );
}
