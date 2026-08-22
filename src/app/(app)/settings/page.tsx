import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { redirect } from "next/navigation";
import { Settings, User, ShieldCheck, Coins, Building2 } from "lucide-react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const [fundsRes, session] = await Promise.all([
    getFundConfigs(),
    auth(),
  ]);

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  const funds = fundsRes.data;
  const userEmail = session?.user?.email || "Authenticated User";
  const userName = session?.user?.name || "Portfolio Owner";
  const userImage = session?.user?.image;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto animate-fade-in pb-16 px-1 sm:px-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-card via-card to-secondary/30 p-5 sm:p-6 rounded-[2rem] border border-border/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Account Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
              Manage your mutual fund configurations, installment reminders, and account profile.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive 2-Column Laptop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Column: Fund Manager (8 Cols on Laptop) */}
        <div className="lg:col-span-8 space-y-6">
          <FundConfigForm funds={funds} />
        </div>

        {/* Side Column: Profile, Reminders & Danger Zone (4 Cols on Laptop) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Account Profile Card */}
          <div className="bg-card rounded-[2rem] p-5 sm:p-6 border border-border/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="h-11 w-11 rounded-2xl object-cover border border-border/50 shadow-sm shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0 font-bold">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div className="overflow-hidden">
                <h3 className="font-extrabold text-sm text-foreground truncate">{userName}</h3>
                <span className="text-xs text-muted-foreground truncate block font-medium">{userEmail}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-400" /> Tracked Funds
                </span>
                <span className="font-mono font-bold text-foreground">{funds.length} Active</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Auth Protection
                </span>
                <span className="font-bold text-emerald-400 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Secured
                </span>
              </div>
            </div>
          </div>

          {/* Installment Reminders Card (Right after Portfolio Owner) */}
          <NotificationSettings userEmail={userEmail} />

          {/* Danger Zone Card */}
          <DeleteAccountDialog />

        </div>


      </div>
    </div>
  );
}
