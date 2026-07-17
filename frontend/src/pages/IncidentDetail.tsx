import { Link } from "react-router-dom";
import { IncidentDetailContainer } from "../containers";

export function IncidentDetail() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <div
        className="sticky top-0 z-20 border-b px-10 py-[18px] backdrop-blur-[10px]"
        style={{
          borderColor: "var(--border-soft)",
          background: "color-mix(in srgb, var(--bg) 82%, transparent)",
        }}
      >
        <Link
          to="/incidents"
          className="inline-flex items-center gap-[7px] rounded-full border py-[7px] pl-2.5 pr-[13px] text-[12.5px] font-semibold text-fg-dim"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to incidents
        </Link>
      </div>

      <div className="px-10 pb-[72px] pt-8">
        <IncidentDetailContainer />
      </div>
    </div>
  );
}
