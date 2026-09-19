import type { Metadata } from "next";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { MobileDetailHeader } from "@/components/settings/mobile-settings-menu";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Reminders | Settings",
};

export default async function SettingsNotificationsPage() {
  const session = await auth();
  const userEmail = session?.user?.email || "Authenticated User";

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 sm:pb-10">
      <div className="lg:hidden">
        <MobileDetailHeader title="Reminders" subtitle={userEmail} />
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reminders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Push reminders and email summaries.
        </p>
      </div>
      <NotificationSettings userEmail={userEmail} />
    </div>
  );
}
