"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

interface NotificationSettingsProps {
  userEmail: string;
}

function StatusPill({ state }: { state: "on" | "off" | "blocked" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        state === "on" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        state === "off" && "bg-secondary text-muted-foreground",
        state === "blocked" && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      )}
    >
      {state}
    </span>
  );
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

  const pushState = isSubscribed ? "on" : permission === "denied" ? "blocked" : "off";

  return (
    <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-none">
      <CardContent className="p-0">
        {/* Push channel */}
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Bell className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Push Notifications</h4>
              <StatusPill state={pushState} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Lock-screen alerts on your phone when an installment is due.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isSubscribed}
            aria-label="Toggle push notifications"
            disabled={isPushLoading || !isSupported}
            onClick={handleTogglePush}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50",
              isSubscribed ? "bg-primary" : "bg-secondary/80 border border-border/60"
            )}
          >
            {isPushLoading ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              </span>
            ) : (
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200",
                  isSubscribed
                    ? "translate-x-5 bg-white"
                    : "translate-x-0.5 bg-muted-foreground/60"
                )}
              />
            )}
          </button>
        </div>

        <div className="mx-5 border-t border-border/60" />

        {/* Email channel */}
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Mail className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Email Notifications</h4>
              <StatusPill state={emailEnabled ? "on" : "off"} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Reminders sent to <strong className="font-medium">{userEmail}</strong>
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailEnabled}
            aria-label="Toggle email notifications"
            disabled={isSaving || isInitialLoading}
            onClick={() => {
              const nextVal = !emailEnabled;
              setEmailEnabled(nextVal);
              handleSavePreferences(nextVal);
            }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50",
              emailEnabled ? "bg-primary" : "bg-secondary/80 border border-border/60"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200",
                emailEnabled
                  ? "translate-x-5 bg-white"
                  : "translate-x-0.5 bg-muted-foreground/60"
              )}
            />
          </button>
        </div>

        {/* Schedule footer strip */}
        <p className="bg-secondary/40 px-5 py-2.5 text-xs text-muted-foreground">
          Alerts go out automatically <strong className="text-foreground">2 days before</strong>{" "}
          and <strong className="text-foreground">on</strong> each installment date.
        </p>
      </CardContent>
    </Card>
  );
}
