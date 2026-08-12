import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const fundsRes = await getFundConfigs();

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  const funds = fundsRes.data;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header section */}
      {/* Header section */}
      <div className="flex items-center gap-4 bg-secondary/30 p-5 sm:p-6 rounded-[2rem] border border-border/50 shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Account Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Manage your fund configurations, security preferences, and data.
          </p>
        </div>
      </div>

      {/* Fund Configurations Manager */}
      <FundConfigForm funds={funds} />

      {/* Change Password Form */}
      <ChangePasswordForm />

      {/* Danger Zone */}
      <DeleteAccountDialog />
    </div>
  );
}
