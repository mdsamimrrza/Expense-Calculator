import type { Metadata } from "next";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { getProfile } from "@/lib/actions/profile";
import { displayNameFor } from "@/lib/utils";
import { ProfileImageManager } from "@/components/settings/profile-image-manager";
import { MobileDetailHeader } from "@/components/settings/mobile-settings-menu";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Profile | Settings",
};

export default async function SettingsProfilePage() {
  const [fundsRes, session, profile] = await Promise.all([
    getFundConfigs(),
    auth(),
    getProfile(),
  ]);

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  const userEmail = profile.email ?? session?.user?.email ?? "Authenticated User";
  const userName = displayNameFor(profile.name ?? session?.user?.name, userEmail);
  const userImage = profile.image ?? session?.user?.image ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 pb-20 sm:pb-10">
      <div className="lg:hidden">
        <MobileDetailHeader title="Profile" subtitle={userEmail} />
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details and profile photo.
        </p>
      </div>
      <ProfileImageManager
        userName={userName}
        userEmail={userEmail}
        initialImage={userImage}
        fundCount={fundsRes.data.length}
      />
    </div>
  );
}
