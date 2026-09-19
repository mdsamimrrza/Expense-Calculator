import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Access Denied",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
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
      </div>

      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <Logo showText={false} className="scale-150" />

        <div className="flex items-center gap-4">
          <span className="text-7xl font-black tracking-tighter text-destructive">
            403
          </span>
          <ShieldAlert className="h-12 w-12 text-muted-foreground" aria-hidden />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access denied</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You don&apos;t have permission to view this page. If you think this
            is a mistake, try signing in with a different account or contact
            support.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild className="font-bold">
            <Link href="/">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {APP_NAME} • Nepali Mutual Fund SIP Tracker
        </p>
      </div>
    </div>
  );
}
