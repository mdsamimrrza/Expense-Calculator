"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_DOWNLOAD_URL } from "@/lib/constants";

const INSTALL_STEPS = [
  "Tap Download APK to get the latest release from GitHub (Android 7.0+, free).",
  "When prompted, allow “Install unknown apps” for your browser.",
  "Open the app and start tracking — no account needed.",
] as const;

export function AppDownloadCard() {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <Card className="rounded-xl border-border bg-card shadow-none">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Take SahakariSIP with you — the same tracker as a fast offline
          Android app. Free, no account needed.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild className="w-full sm:w-auto">
            <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              Download APK
            </a>
          </Button>
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            aria-expanded={showSteps}
            className="text-sm font-medium text-primary hover:underline"
          >
            {showSteps ? "Hide install steps" : "How to install"}
          </button>
        </div>
        {showSteps && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {INSTALL_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
