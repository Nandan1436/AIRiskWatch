import { useNavigate } from "react-router-dom";
import { AccountDetailRow, SignInMethodBadge } from "../components/account";
import { Button, Card, ErrorMessage, TextField, ToggleSwitch } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useUpdateProfile } from "../hooks/userHooks";
import type { User } from "../interfaces";

export function AccountContainer() {
  const { user } = useAuth();
  // ProtectedRoute guarantees a user; keyed so the form resets if it changes.
  return user ? <AccountSettings key={user.id} user={user} /> : null;
}

function AccountSettings({ user }: { user: User }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    generalError,
    savedMessage,
    isSubmitting,
    onSubmit,
    setEmailNotifications,
    isDirty,
  } = useUpdateProfile(user);

  function handleSignOut() {
    logout();
    navigate("/incidents");
  }

  return (
    <div className="flex max-w-[680px] flex-col gap-6">
      <Card title="Profile" description="Your username and how you sign in.">
        <form onSubmit={onSubmit} className="flex items-start gap-3">
          <div className="flex-1">
            <TextField
              label="Username"
              name="username"
              value={formData.username}
              onChange={(e) => {
                setFormData({ username: e.target.value });
                setFieldErrors({});
              }}
              error={fieldErrors.username}
            />
          </div>
          <Button type="submit" disabled={!isDirty || isSubmitting} className="mt-[24px]">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
        <div className="mt-5">
          <AccountDetailRow label="Email">{user.email}</AccountDetailRow>
          <AccountDetailRow label="Role">
            <span className="capitalize">{user.role}</span>
          </AccountDetailRow>
          <AccountDetailRow label="Sign-in methods">
            {user.has_password && <SignInMethodBadge label="Password" />}
            {user.has_google && <SignInMethodBadge label="Google" />}
          </AccountDetailRow>
          <AccountDetailRow label="Member since">
            {new Date(user.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </AccountDetailRow>
        </div>
      </Card>

      <Card
        title="Email notifications"
        description="A monthly digest of newly reported AI incidents and risk trends."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[13.5px] font-semibold text-fg">Monthly digest email</div>
            <div className="mt-px text-[12px] text-fg-faint">
              Sent at the start of each month, covering the previous month.
            </div>
          </div>
          <ToggleSwitch
            label="Monthly digest email"
            checked={user.email_notifications}
            onChange={setEmailNotifications}
            disabled={isSubmitting}
          />
        </div>
      </Card>

      {generalError && <ErrorMessage message={generalError} />}
      {savedMessage && !generalError && (
        <p className="text-[12.5px]" style={{ color: "var(--green)" }}>
          {savedMessage}
        </p>
      )}

      <div>
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
