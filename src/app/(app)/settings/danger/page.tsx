import type { Metadata } from "next";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { MobileDetailHeader } from "@/components/settings/mobile-settings-menu";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { getEntries } from "@/lib/actions/entries";

export const metadata: Metadata = {
  title: "Danger Zone | Settings",
};

export default async function SettingsDangerPage() {
  const [fundsRes, entriesRes] = await Promise.all([
    getFundConfigs(),
    getEntries({ pageSize: 1 }),
  ]);

  const fundCount = fundsRes.success ? fundsRes.data?.length ?? 0 : undefined;
  const entryCount = entriesRes.success ? entriesRes.data?.total ?? 0 : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 sm:pb-10">
      <div className="lg:hidden">
        <MobileDetailHeader title="Danger Zone" subtitle="Irreversible actions" />
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-destructive">Danger Zone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and data.
        </p>
      </div>
      <DeleteAccountDialog fundCount={fundCount} entryCount={entryCount} />
    </div>
  );
}
