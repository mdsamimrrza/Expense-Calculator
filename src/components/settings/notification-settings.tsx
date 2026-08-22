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
  ShieldCheck,
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
    <Card className="border-border/60 rounded-[2rem] shadow-xl bg-card overflow-hidden transition-all">
      {/* Header with gradient and active counter */}
      <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-r from-card via-card to-amber-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-sm shadow-amber-500/10 shrink-0">
              <Bell className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black tracking-tight text-foreground">
                  Installment Reminders
                </CardTitle>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  Automated
                </span>
              </div>
              <CardDescription className="text-xs mt-0.5 font-medium text-muted-foreground">
                Get notified on mobile and email before your monthly deposit is due.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary/80 border border-border/50 text-foreground flex items-center gap-1.5 shadow-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  activeChannelsCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                }`}
              />
              {activeChannelsCount > 0 ? `${activeChannelsCount} Active Channel${activeChannelsCount > 1 ? "s" : ""}` : "All Disabled"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {/* Channel 1: Mobile PWA Push Notification */}
        <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-[1.5rem] border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-sm shadow-blue-500/10 mt-0.5">
              <Smartphone className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-extrabold text-sm text-foreground">Mobile Push Notifications</h4>
                {isSubscribed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> Active on Device
                  </span>
                ) : permission === "denied" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="h-3 w-3" /> Blocked in Browser
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Native lock-screen pop-up alerts on your phone even when the browser or app is closed.
              </p>
            </div>
          </div>

          {/* Sleek iOS Style Animated Switch */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
            <span className="text-xs font-bold sm:hidden text-muted-foreground">
              {isSubscribed ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              disabled={isPushLoading || !isSupported}
              onClick={handleTogglePush}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                isSubscribed ? "bg-emerald-500 shadow-md shadow-emerald-500/30" : "bg-secondary/80 border border-border/60"
              }`}
            >
              {isPushLoading ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                </span>
              ) : (
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSubscribed ? "translate-x-5" : "translate-x-0.5 bg-muted-foreground/60"
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Channel 2: Email Notifications */}
        <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-[1.5rem] border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-sm shadow-purple-500/10 mt-0.5">
              <Mail className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-extrabold text-sm text-foreground">Email Notifications</h4>
                {emailEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sends branded monthly reminder statements to <strong className="text-foreground font-semibold">{userEmail}</strong> with one-click deposit links.
              </p>
            </div>
          </div>

          {/* Sleek iOS Style Animated Switch */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
            <span className="text-xs font-bold sm:hidden text-muted-foreground">
              {emailEnabled ? "Enabled" : "Disabled"}
            </span>
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
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                emailEnabled ? "bg-emerald-500 shadow-md shadow-emerald-500/30" : "bg-secondary/80 border border-border/60"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  emailEnabled ? "translate-x-5" : "translate-x-0.5 bg-muted-foreground/60"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Schedule & Timing Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2 p-4 rounded-[1.25rem] bg-secondary/30 border border-border/50">
            <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-500" /> Monthly Installment Due Day
            </Label>
            <Select
              value={reminderDay}
              onValueChange={(val) => {
                setReminderDay(val);
                handleSavePreferences(undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-background/80 border-border/60 shadow-sm focus:ring-1 focus:ring-amber-500">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)} className="text-xs font-medium">
                    Day {day} of every month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">The date you usually deposit your SIP installment.</p>
          </div>

          <div className="space-y-2 p-4 rounded-[1.25rem] bg-secondary/30 border border-border/50">
            <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" /> Advance Notice
            </Label>
            <Select
              value={notifyDaysBefore}
              onValueChange={(val) => {
                setNotifyDaysBefore(val);
                handleSavePreferences(undefined, undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-background/80 border-border/60 shadow-sm focus:ring-1 focus:ring-blue-400">
                <SelectValue placeholder="Advance Notice" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="0" className="text-xs font-medium">Only on the Due Date</SelectItem>
                <SelectItem value="1" className="text-xs font-medium">1 Day Before & on Due Date</SelectItem>
                <SelectItem value="2" className="text-xs font-medium">2 Days Before & on Due Date</SelectItem>
                <SelectItem value="3" className="text-xs font-medium">3 Days Before & on Due Date</SelectItem>
                <SelectItem value="5" className="text-xs font-medium">5 Days Before & on Due Date</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">How early you want to receive the reminder.</p>
          </div>
        </div>

        {/* Live Summary Insight Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-secondary/30 border border-amber-500/20 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-extrabold text-foreground">Automation Schedule: </span>
            {activeChannelsCount === 0 ? (
              <span>All notifications are currently turned off.</span>
            ) : (
              <span>
                Reminders will automatically fire on <strong>Day {reminderDay}</strong> (and {notifyDaysBefore} days before) at <strong>8:45 AM</strong> via{" "}
                <strong className="text-foreground">
                  {isSubscribed && emailEnabled
                    ? "Push & Email"
                    : isSubscribed
                    ? "Mobile Push"
                    : "Email"}
                </strong>
                .
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
