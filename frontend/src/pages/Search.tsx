import { SearchContainer } from "../containers";

export function Search() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <div
        className="sticky top-0 z-20 flex items-center justify-between gap-6 border-b px-10 py-[18px] backdrop-blur-[10px]"
        style={{
          borderColor: "var(--border-soft)",
          background: "color-mix(in srgb, var(--bg) 82%, transparent)",
        }}
      >
        <div>
          <div className="text-[19px] font-bold tracking-tight text-fg">
            Semantic search
          </div>
          <div className="mt-px text-[12.5px] text-fg-dim">
            Describe a system or ask a question — get relevant incidents with a
            grounded summary
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] px-10 pb-16 pt-8">
        <SearchContainer />
      </div>
    </div>
  );
}
