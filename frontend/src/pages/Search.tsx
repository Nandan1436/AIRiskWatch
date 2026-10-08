import { SearchModeTabs } from "../components/search";
import { SearchContainer } from "../containers";

export function Search() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <SearchModeTabs />
      <SearchContainer />
    </div>
  );
}
