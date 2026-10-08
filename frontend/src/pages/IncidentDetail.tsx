import { BackLink } from "../components/incidents";
import { IncidentDetailContainer } from "../containers";

export function IncidentDetail() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <BackLink />
      <IncidentDetailContainer />
    </div>
  );
}
