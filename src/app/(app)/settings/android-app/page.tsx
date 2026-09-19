import type { Metadata } from "next";
import { AppDownloadCard } from "@/components/settings/app-download-card";
import { MobileDetailHeader } from "@/components/settings/mobile-settings-menu";

export const metadata: Metadata = {
  title: "Android App | Settings",
};

export default async function SettingsAppPage() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 sm:pb-10">
      <div className="lg:hidden">
        <MobileDetailHeader title="Android App" subtitle="Free APK download" />
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Android App</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take SahakariSIP with you — free offline Android app.
        </p>
      </div>
      <AppDownloadCard />
    </div>
  );
}
