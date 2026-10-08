import { useNavigate } from "react-router-dom";
import { AtSign, CalendarDays, LogIn, Mail, Shield } from "lucide-react";
import {
  AccountDetailRow,
  AccountProfileCard,
  PreferenceRow,
  SignInMethodBadge,
  UsernameInput,
} from "../components/account";
import { Button, Card, ErrorMessage, ToggleSwitch } from "../components/ui";
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
    navigate("/");
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
      <AccountProfileCard user={user} onSignOut={handleSignOut} />

      <div className="flex min-w-0 flex-col gap-4">
        <Card title="Profile" description="Your username and how you sign in.">
          <form onSubmit={onSubmit}>
            <AccountDetailRow
              label="Username"
              icon={<AtSign />}
              action={
                <Button type="submit" variant="ghost" size="sm" disabled={!isDirty || isSubmitting}>
                  {isSubmitting && isDirty ? "Saving…" : "Save"}
                </Button>
              }
            >
              <UsernameInput
                value={formData.username}
                error={fieldErrors.username}
                onChange={(username) => {
                  setFormData({ username });
                  setFieldErrors({});
                }}
              />
            </AccountDetailRow>
          </form>
          <AccountDetailRow label="Email" icon={<Mail />}>
            {user.email}
          </AccountDetailRow>
          <AccountDetailRow label="Role" icon={<Shield />}>
            <span className="capitalize">{user.role}</span>
          </AccountDetailRow>
          <AccountDetailRow label="Sign-in methods" icon={<LogIn />}>
            {user.has_password && <SignInMethodBadge method="password" />}
            {user.has_google && <SignInMethodBadge method="google" />}
          </AccountDetailRow>
          <AccountDetailRow label="Member since" icon={<CalendarDays />}>
            {new Date(user.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </AccountDetailRow>
        </Card>

        <Card title="Email notifications" description={`What we send to ${user.email}`}>
          <PreferenceRow
            title="Monthly digest email"
            description="A summary of the previous month's AI incidents, sent on the 1st."
            control={
              <ToggleSwitch
                label="Monthly digest email"
                checked={user.email_notifications}
                onChange={setEmailNotifications}
                disabled={isSubmitting}
              />
            }
          />
        </Card>

        {generalError && <ErrorMessage message={generalError} />}
        {savedMessage && !generalError && <p className="m-0 text-[12.5px] text-down">{savedMessage}</p>}
      </div>
    </div>
  );
}
