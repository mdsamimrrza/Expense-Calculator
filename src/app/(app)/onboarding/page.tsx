import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Get Started",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
