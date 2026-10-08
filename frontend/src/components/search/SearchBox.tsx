import { useState, type FormEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui";
import styles from "./Search.module.css";

interface SearchBoxProps {
  initialQuery: string;
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
  /** Line under the box (pipeline, result count). */
  meta?: ReactNode;
}

export function SearchBox({ initialQuery, onSubmit, isLoading, placeholder, meta }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.box} role="search">
        <Search className={styles.boxIcon} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "Describe an incident or an AI system in plain language…"}
          aria-label="Search query"
          autoFocus={!initialQuery}
        />
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? "Searching…" : "Search"}
        </Button>
      </form>
      {meta && <div className={styles.pipeline}>{meta}</div>}
    </>
  );
}
