"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, Send, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
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
        description: "Your installment reminder schedule has been updated.",
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

  async function handleTestPush() {
    if (!isSubscribed) {
      toast({
        title: "Push not enabled",
        description: "Please enable mobile push notifications on this device first.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingPush(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "push" }),
      });

      const json = await res.json();
      if (res.ok) {
        toast({
          title: "Test Push Dispatched! 📲",
          description: "Check your phone status bar or notification tray.",
        });
      } else {
        throw new Error(json.error || "Failed to deliver test push");
      }
    } catch (err: any) {
      toast({
        title: "Test Failed",
        description: err?.message || "Could not send test push.",
        variant: "destructive",
      });
    } finally {
      setIsTestingPush(false);
    }
  }

  async function handleTestEmail() {
    setIsTestingEmail(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email" }),
      });

      const json = await res.json();
      if (res.ok) {
        toast({
          title: "Test Email Sent! 📧",
          description: `Check your inbox at ${userEmail}.`,
        });
      } else {
        throw new Error(json.error || "Failed to send test email");
      }
    } catch (err: any) {
      toast({
        title: "Email Test Failed",
        description: err?.message || "Could not send test email.",
        variant: "destructive",
      });
    } finally {
      setIsTestingEmail(false);
    }
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card overflow-hidden">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-extrabold">Installment Reminders</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-medium">
                Receive monthly SIP payment alerts on your mobile phone and email.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-6 pt-2">
        {/* Channel 1: Mobile PWA Push Notification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[1.5rem] border border-border/50 bg-secondary/30 gap-3 sm:gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Mobile Push Notifications</h4>
                {isSubscribed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Active on this device
                  </span>
                ) : permission === "denied" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="h-3 w-3" /> Blocked in browser
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">Inactive</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Receive native pop-up reminders on your mobile lock screen even when app is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              disabled={isPushLoading || !isSupported}
              onClick={handleTogglePush}
              className="rounded-xl font-bold h-8 text-xs"
            >
              {isPushLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSubscribed ? (
                "Disable Push"
              ) : (
                "Enable Mobile Push"
              )}
            </Button>
          </div>
        </div>

        {/* Channel 2: Email Notifications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[1.5rem] border border-border/50 bg-secondary/30 gap-3 sm:gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Email Notifications</h4>
                {emailEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Enabled
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">Disabled</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sends branded reminder emails to <strong className="text-foreground">{userEmail}</strong> with one-click deposit links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              size="sm"
              variant={emailEnabled ? "outline" : "default"}
              disabled={isSaving}
              onClick={() => {
                const nextVal = !emailEnabled;
                setEmailEnabled(nextVal);
                handleSavePreferences(nextVal);
              }}
              className="rounded-xl font-bold h-8 text-xs"
            >
              {emailEnabled ? "Disable Email" : "Enable Email"}
            </Button>
          </div>
        </div>

        {/* Schedule & Timing Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2 p-3.5 rounded-2xl bg-secondary/20 border border-border/40">
            <Label className="text-xs font-bold text-foreground">Monthly Installment Due Day</Label>
            <Select
              value={reminderDay}
              onValueChange={(val) => {
                setReminderDay(val);
                handleSavePreferences(undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/50">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    Day {day} of every month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">The date you usually deposit your SIP.</p>
          </div>

          <div className="space-y-2 p-3.5 rounded-2xl bg-secondary/20 border border-border/40">
            <Label className="text-xs font-bold text-foreground">Advance Notice</Label>
            <Select
              value={notifyDaysBefore}
              onValueChange={(val) => {
                setNotifyDaysBefore(val);
                handleSavePreferences(undefined, undefined, val);
              }}
              disabled={isSaving || isInitialLoading}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/50">
                <SelectValue placeholder="Advance Notice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Only on the Due Date</SelectItem>
                <SelectItem value="1">1 Day Before & on Due Date</SelectItem>
                <SelectItem value="2">2 Days Before & on Due Date</SelectItem>
                <SelectItem value="3">3 Days Before & on Due Date</SelectItem>
                <SelectItem value="5">5 Days Before & on Due Date</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">How early you want to be notified.</p>
          </div>
        </div>

        {/* Live Test Buttons */}
        <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Verify your notifications are working immediately:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isTestingPush || !isSubscribed}
              onClick={handleTestPush}
              className="rounded-xl font-bold h-8 text-xs flex-1 sm:flex-initial"
            >
              {isTestingPush ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              )}
              Test Mobile Push
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isTestingEmail || !emailEnabled}
              onClick={handleTestEmail}
              className="rounded-xl font-bold h-8 text-xs flex-1 sm:flex-initial"
            >
              {isTestingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Mail className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              )}
              Test Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
