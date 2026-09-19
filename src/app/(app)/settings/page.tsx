import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { AppDownloadCard } from "@/components/settings/app-download-card";
import { ProfileImageManager } from "@/components/settings/profile-image-manager";
import { getProfile } from "@/lib/actions/profile";
import { displayNameFor } from "@/lib/utils";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const [fundsRes, session, profile] = await Promise.all([
    getFundConfigs(),
    auth(),
    getProfile(),
  ]);

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  const funds = fundsRes.data;
  // Live DB values first (never stale), session as fallback.
  const userEmail = profile.email ?? session?.user?.email ?? "Authenticated User";
  const userName = displayNameFor(
    profile.name ?? session?.user?.name,
    userEmail
  );
  const userImage = profile.image ?? session?.user?.image ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-8 pb-20 sm:pb-10">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your funds, reminders, and account.
        </p>
      </div>

      {/* Profile */}
      <section aria-label="Profile">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="mt-3">
          <ProfileImageManager
            userName={userName}
            userEmail={userEmail}
            initialImage={userImage}
            fundCount={funds.length}
          />
        </div>
      </section>

      {/* Funds */}
      <section aria-label="Fund configurations">
        <h2 className="text-sm font-semibold text-foreground">Funds</h2>
        <div className="mt-3">
          <FundConfigForm funds={funds} />
        </div>
      </section>

      {/* Reminders */}
      <section aria-label="Notifications">
        <h2 className="text-sm font-semibold text-foreground">Reminders</h2>
        <div className="mt-3">
          <NotificationSettings userEmail={userEmail} />
        </div>
      </section>

      {/* Android app */}
      <section aria-label="Android app">
        <h2 className="text-sm font-semibold text-foreground">Android app</h2>
        <div className="mt-3">
          <AppDownloadCard />
        </div>
      </section>

      {/* Danger zone */}
      <section aria-label="Danger zone">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <div className="mt-3">
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
