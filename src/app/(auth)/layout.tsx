import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground text-xl font-bold shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground text-center">
            Track your Nepali mutual fund SIP investments
          </p>
        </div>

        {/* Auth form */}
        {children}
      </div>
    </div>
  );
}
