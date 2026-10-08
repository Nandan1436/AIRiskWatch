import { PageHead } from "../components/layout";
import { AccountContainer } from "../containers";

export function Account() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHead
        crumbs={[{ label: "Home", to: "/" }, { label: "Account" }]}
        eyebrow="Your account"
        title="Account settings"
        description="Manage your profile, sign-in methods and email preferences."
      />
      <AccountContainer />
    </div>
  );
}
