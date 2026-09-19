import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { FundConfigForm } from "@/components/settings/fund-config-form";
import { MobileDetailHeader } from "@/components/settings/mobile-settings-menu";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Funds | Settings",
};

export default async function SettingsFundsPage() {
  const fundsRes = await getFundConfigs();

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 sm:pb-10">
      <div className="lg:hidden">
        <MobileDetailHeader
          title="My Funds"
          subtitle={`${fundsRes.data.length} tracked`}
        />
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Funds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit, or remove tracked funds.
        </p>
      </div>
      <FundConfigForm funds={fundsRes.data} />
    </div>
  );
}
