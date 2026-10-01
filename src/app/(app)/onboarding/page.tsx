import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Get Started",
};

export default async function OnboardingPage() {
  // A user who already tracks funds must never land in the wizard - it
  // would look like their portfolio was wiped. This is the safety net
  // for any failure that redirects here (e.g. a dashboard data error).
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data: funds } = await supabase
      .from("fund_config")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (funds && funds.length > 0) {
      redirect("/dashboard");
    }
  }

  return <OnboardingWizard />;
}
