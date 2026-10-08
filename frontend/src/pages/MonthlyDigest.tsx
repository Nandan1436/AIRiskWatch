import { useParams } from "react-router-dom";
import { MonthlyDigestContainer } from "../containers";

export function MonthlyDigest() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <MonthlyDigestContainer yearMonth={yearMonth} />
    </div>
  );
}
