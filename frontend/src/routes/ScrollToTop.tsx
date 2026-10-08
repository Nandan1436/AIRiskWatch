import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the top when the path changes. Query-string changes (filters,
 * page numbers) are left alone; the list hooks scroll for those themselves.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
