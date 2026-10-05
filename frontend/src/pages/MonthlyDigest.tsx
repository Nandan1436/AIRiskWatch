import { useParams } from "react-router-dom";
import { PageHeader } from "../components/layout";
import { MonthlyDigestContainer } from "../containers";

export function MonthlyDigest() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHeader
        title="Monthly digest"
        subtitle="AI incidents reported in each of the last five months"
      />
      <div className="max-w-[1240px] px-10 pb-16 pt-8">
        <MonthlyDigestContainer yearMonth={yearMonth} />
      </div>
    </div>
  );
}
