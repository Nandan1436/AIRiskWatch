import { SearchModeTabs } from "../components/search";
import { RiskChecklistContainer } from "../containers";

export function RiskChecklist() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <SearchModeTabs />
      <RiskChecklistContainer />
    </div>
  );
}
