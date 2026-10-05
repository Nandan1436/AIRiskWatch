import { PageHeader } from "../components/layout";
import { AccountContainer } from "../containers";

export function Account() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHeader title="Account" subtitle="Manage your profile and email preferences" />
      <div className="max-w-[1240px] px-10 pb-16 pt-8">
        <AccountContainer />
      </div>
    </div>
  );
}
