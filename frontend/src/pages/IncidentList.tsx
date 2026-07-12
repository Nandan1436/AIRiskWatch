import {
  DashboardSummaryContainer,
  IncidentInsightsContainer,
  IncidentListContainer,
} from "../containers";

export function IncidentList() {
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
            Incidents explorer
          </div>
          <div className="mt-px text-[12.5px] text-fg-dim">
            Real-world AI harm records from the MIT AI Risk Repository
          </div>
        </div>
        <div
          className="flex items-center gap-[7px] rounded-full border px-[13px] py-[7px] text-[12px] text-fg-dim"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <span
            className="h-[7px] w-[7px] rounded-full bg-green"
            style={{ boxShadow: "0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent)" }}
          />
          Live data
        </div>
      </div>

      <div className="max-w-[1240px] px-10 pb-16 pt-8">
        <DashboardSummaryContainer />
        <IncidentInsightsContainer />
        <IncidentListContainer />
      </div>
    </div>
  );
}
