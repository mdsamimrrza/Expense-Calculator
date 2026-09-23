"use client";

import { Download, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_DOWNLOAD_URL } from "@/lib/constants";

const INSTALL_STEPS = [
  "Tap Download APK or scan the QR code to get the latest release from GitHub.",
  "When prompted, allow “Install unknown apps” for your browser.",
  "Open the app and start tracking.",
] as const;

export function AppDownloadCard() {
  return (
    <div className="space-y-4">
      {/* App + download */}
      <Card className="rounded-2xl border-border bg-card shadow-none">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Smartphone className="h-7 w-7" strokeWidth={1.75} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              SahakariSIP Android App
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The same SIP tracker as a fast offline Android app. Works on
              Android 7.0 and newer, no account required.
            </p>
          </div>

          <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
            <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download APK
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* QR + steps */}
      <Card className="rounded-2xl border-border bg-card shadow-none">
        <CardContent className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <QRCode value={APP_DOWNLOAD_URL} size={120} level="M" />
            </div>
            <p className="text-xs text-muted-foreground">
              Scan with your phone camera
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">
              Installation steps
            </h4>
            <ol className="mt-3 space-y-3">
              {INSTALL_STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
