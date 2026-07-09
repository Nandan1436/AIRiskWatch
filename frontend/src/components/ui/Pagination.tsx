interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
}

export function Pagination({
  offset,
  limit,
  total,
  onOffsetChange,
}: PaginationProps) {
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;
  const pageNum = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mt-6 flex items-center justify-between border-t border-border-soft pt-5">
      <div className="text-[12.5px] text-fg-dim">
        Page{" "}
        <span className="font-mono font-semibold text-fg">{pageNum}</span> of{" "}
        <span className="font-mono font-semibold text-fg">{pageCount}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:text-fg-faint"
          style={{ color: hasPrev ? "var(--fg)" : undefined }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
          className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:text-fg-faint"
          style={{ color: hasNext ? "var(--fg)" : undefined }}
        >
          Next
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
