import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { redirect } from "next/navigation";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account & Portfolio Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your fund configs, update security settings, or delete account data.
        </p>
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
