import { useState, type FormEvent } from "react";

interface SearchBoxProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function SearchBox({ onSubmit, isLoading }: SearchBoxProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Describe the AI system you're building, or ask a question — e.g. 'an obstacle-detection aid for blind pedestrians' or 'what kinds of AI systems have harmed women and children?'"
        rows={3}
        className="min-w-0 flex-1 resize-none rounded-xl border px-4 py-3 text-[13.5px] text-fg outline-none"
        style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="h-fit self-end rounded-xl px-5 py-3 text-[13px] font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {isLoading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
