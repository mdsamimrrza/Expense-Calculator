"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface NotificationSettingsProps {
  userEmail: string;
}

export function NotificationSettings({ userEmail }: NotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushNotifications();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { toast } = useToast();

  // Load user's saved preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setEmailEnabled(json.data.email_enabled ?? true);
          }
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadPreferences();
  }, []);

  async function handleSavePreferences(newEmailEnabled?: boolean) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          push_enabled: isSubscribed,
          email_enabled: newEmailEnabled !== undefined ? newEmailEnabled : emailEnabled,
          reminder_day: 1,
          notify_days_before: 2,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        title: "Preferences Saved",
        description: "Your reminder channels have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePush() {
    if (isSubscribed) {
      const success = await unsubscribeFromPush();
      if (success) {
        handleSavePreferences();
      }
    } else {
      const success = await subscribeToPush();
      if (success) {
        handleSavePreferences();
      }
    }
  }

  return (
    <Card className="rounded-xl border-border bg-card shadow-none">
      {/* Header */}
      <CardHeader className="px-4 pt-4 pb-3 sm:px-5">
        <CardTitle className="text-sm font-semibold text-foreground">
          Installment Reminders
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Automatic monthly SIP deposit alerts via mobile push and email.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 sm:px-5">
        {/* Channel 1: Mobile PWA Push Notification */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">Mobile Push Notifications</h4>
              {isSubscribed ? (
                <span className="text-xs text-muted-foreground">On</span>
              ) : permission === "denied" ? (
                <span className="text-xs text-destructive">Blocked</span>
              ) : (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Lock-screen alerts on your phone when installment is due.
            </p>
          </div>

          {/* Compact Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isSubscribed}
            disabled={isPushLoading || !isSupported}
            onClick={handleTogglePush}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 ${
              isSubscribed ? "bg-primary" : "bg-secondary/80 border border-border/60"
            }`}
          >
            {isPushLoading ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              </span>
            ) : (
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isSubscribed ? "translate-x-5" : "translate-x-0.5 bg-muted-foreground/60"
                }`}
              />
            )}
          </button>
        </div>

        {/* Channel 2: Email Notifications */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">Email Notifications</h4>
              <span className="text-xs text-muted-foreground">
                {emailEnabled ? "On" : "Off"}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Statements sent to <strong className="font-medium">{userEmail}</strong>
            </p>
          </div>

          {/* Compact Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={emailEnabled}
            disabled={isSaving || isInitialLoading}
            onClick={() => {
              const nextVal = !emailEnabled;
              setEmailEnabled(nextVal);
              handleSavePreferences(nextVal);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 ${
              emailEnabled ? "bg-primary" : "bg-secondary/80 border border-border/60"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                emailEnabled ? "translate-x-5" : "translate-x-0.5 bg-muted-foreground/60"
              }`}
            />
          </button>
        </div>

        {/* Standard Schedule Note */}
        <p className="text-xs text-muted-foreground">
          Alerts are sent automatically 2 days before and on your installment date.
        </p>
      </CardContent>
    </Card>
  );
}
