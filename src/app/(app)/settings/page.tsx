import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { getProfile } from "@/lib/actions/profile";
import { displayNameFor } from "@/lib/utils";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { AppDownloadCard } from "@/components/settings/app-download-card";
import { ProfileImageManager } from "@/components/settings/profile-image-manager";
import {
  MobileSettingsGroup,
  MobileSettingsRow,
  MobileProfileHero,
} from "@/components/settings/mobile-settings-menu";
import { User, Building2, Bell, Smartphone, AlertTriangle } from "lucide-react";
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
  const userName = displayNameFor(profile.name ?? session?.user?.name, userEmail);
  const userImage = profile.image ?? session?.user?.image ?? null;

  return (
    <>
      {/* ── Mobile: nested hub (like the APK) ─────────────────── */}
      <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 lg:hidden">
        <h1 className="pt-1 text-center text-lg font-bold text-foreground">
          Settings
        </h1>

        <MobileProfileHero
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          fundCount={funds.length}
        />

        <MobileSettingsGroup title="Settings">
          <MobileSettingsRow
            href="/settings/profile"
            icon={<User className="h-[18px] w-[18px]" strokeWidth={2} />}
            label="Profile"
            subtitle="Your details, photo, and fund name"
            tint="emerald"
          />
          <MobileSettingsRow
            href="/settings/funds"
            icon={<Building2 className="h-[18px] w-[18px]" strokeWidth={2} />}
            label="My Funds"
            subtitle="Add, edit, or remove tracked funds"
            badge={`${funds.length}`}
            tint="violet"
          />
          <MobileSettingsRow
            href="/settings/notifications"
            icon={<Bell className="h-[18px] w-[18px]" strokeWidth={2} />}
            label="Reminders"
            subtitle="Push reminders and email summaries"
            tint="amber"
          />
          <MobileSettingsRow
            href="/settings/android-app"
            icon={<Smartphone className="h-[18px] w-[18px]" strokeWidth={2} />}
            label="Android App"
            subtitle="Free APK download"
            tint="sky"
            last
          />
        </MobileSettingsGroup>

        <MobileSettingsGroup title="Account">
          <MobileSettingsRow
            href="/settings/danger"
            icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />}
            label="Danger Zone"
            subtitle="Delete account and data"
            destructive
            tint="rose"
            last
          />
        </MobileSettingsGroup>
      </div>

      {/* ── Desktop: stacked sections ─────────────────────────── */}
      <div className="mx-auto hidden w-full max-w-3xl animate-fade-in space-y-8 pb-10 lg:block">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your funds, reminders, and account.
          </p>
        </div>

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

        <section aria-label="Fund configurations">
          <h2 className="text-sm font-semibold text-foreground">Funds</h2>
          <div className="mt-3">
            <FundConfigForm funds={funds} />
          </div>
        </section>

        <section aria-label="Notifications">
          <h2 className="text-sm font-semibold text-foreground">Reminders</h2>
          <div className="mt-3">
            <NotificationSettings userEmail={userEmail} />
          </div>
        </section>

        <section aria-label="Android app">
          <h2 className="text-sm font-semibold text-foreground">Android app</h2>
          <div className="mt-3">
            <AppDownloadCard />
          </div>
        </section>

        <section aria-label="Danger zone">
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          <div className="mt-3">
            <DeleteAccountDialog />
          </div>
        </section>
      </div>
    </>
  );
}
