import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
      <div className="absolute top-8 w-full max-w-7xl px-8 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <Logo showText={false} className="scale-150 mb-2" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">
              Track your Nepali mutual fund SIP investments
            </p>
          </div>
        </div>

        {/* Auth form */}
        {children}
      </div>
    </div>
  );
}
