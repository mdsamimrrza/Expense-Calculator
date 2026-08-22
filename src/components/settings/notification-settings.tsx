"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [reminderDay, setReminderDay] = useState("1");
  const [notifyDaysBefore, setNotifyDaysBefore] = useState("2");
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
            setReminderDay(String(json.data.reminder_day || 1));
            setNotifyDaysBefore(String(json.data.notify_days_before ?? 2));
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

  async function handleSavePreferences(newEmailEnabled?: boolean, newDay?: string, newDaysBefore?: string) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          push_enabled: isSubscribed,
          email_enabled: newEmailEnabled !== undefined ? newEmailEnabled : emailEnabled,
          reminder_day: Number(newDay || reminderDay),
          notify_days_before: Number(newDaysBefore || notifyDaysBefore),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        title: "Preferences Saved",
        description: "Your monthly installment reminder schedule has been updated.",
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

  const activeChannelsCount = (isSubscribed ? 1 : 0) + (emailEnabled ? 1 : 0);

  return (
    <Card className="border-border/60 rounded-[1.75rem] shadow-sm bg-card overflow-hidden transition-all">
      {/* Slim Header */}
      <CardHeader className="px-5 py-3.5 border-b border-border/40 bg-gradient-to-r from-card to-amber-500/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-sm shrink-0">
              <Bell className="h-4 w-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-extrabold tracking-tight text-foreground">
                  Installment Reminders
                </CardTitle>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  Automated
                </span>
              </div>
              <CardDescription className="text-[11px] font-medium text-muted-foreground">
                Monthly SIP payment alerts via mobile push and email.
              </CardDescription>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/50 text-foreground flex items-center gap-1.5 shrink-0">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeChannelsCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {activeChannelsCount > 0 ? `${activeChannelsCount} Active` : "Off"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Channel 1: Mobile PWA Push Notification (Compact Row) */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-all gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm text-foreground">Mobile Push</h4>
                {isSubscribed ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    ● Active
                  </span>
                ) : permission === "denied" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    Blocked
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground">Inactive</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Native lock-screen alert on your phone.
              </p>
            </div>
          </div>

          {/* Compact Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isSubscribed}
            disabled={isPushLoading || !isSupported}
            onClick={handleTogglePush}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 ${
              isSubscribed ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-secondary/80 border border-border/60"
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

        {/* Channel 2: Email Notifications (Compact Row) */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-all gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm text-foreground">Email Alert</h4>
                {emailEnabled ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    ● Active
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground">Disabled</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Sent to <strong className="text-foreground/90 font-medium">{userEmail}</strong>
              </p>
            </div>
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
              emailEnabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-secondary/80 border border-border/60"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                emailEnabled ? "translate-x-5" : "translate-x-0.5 bg-muted-foreground/60"
              }`}
            />
          </button>
        </div>

        {/* Schedule & Timing Controls (Compact 2-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
          <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/20 border border-border/40">
            <Label className="text-[11px] font-extrabold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-amber-500" /> Due Day
            </Label>
            <Select
              value={reminderDay}
              onValueChange={(val) => {
                setReminderDay(val);
                handleSavePreferences(undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background/80 border-border/50 focus:ring-1 focus:ring-amber-500">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent className="max-h-56 rounded-xl">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)} className="text-xs">
                    Day {day} of every month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/20 border border-border/40">
            <Label className="text-[11px] font-extrabold text-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-blue-400" /> Advance Notice
            </Label>
            <Select
              value={notifyDaysBefore}
              onValueChange={(val) => {
                setNotifyDaysBefore(val);
                handleSavePreferences(undefined, undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background/80 border-border/50 focus:ring-1 focus:ring-blue-400">
                <SelectValue placeholder="Advance Notice" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="0" className="text-xs">Only on Due Date</SelectItem>
                <SelectItem value="1" className="text-xs">1 Day Before & on Due Date</SelectItem>
                <SelectItem value="2" className="text-xs">2 Days Before & on Due Date</SelectItem>
                <SelectItem value="3" className="text-xs">3 Days Before & on Due Date</SelectItem>
                <SelectItem value="5" className="text-xs">5 Days Before & on Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Schedule Insight Footer */}
        <div className="p-2.5 px-3 rounded-xl bg-secondary/20 border border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">
            Fires automatically on <strong>Day {reminderDay}</strong> (and {notifyDaysBefore}d before) at <strong>8:45 AM</strong>.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
