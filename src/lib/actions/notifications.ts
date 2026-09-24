"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { computeSchedule, nepalTodayAD, formatBSDate } from "@/lib/calendar/bs";
import { resolveSchedule } from "@/lib/sip-schedule";
import type { FundConfig, UpcomingInstallment } from "@/lib/types";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  url: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationData {
  success: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  upcoming: UpcomingInstallment[];
  error?: string;
}

/**
 * One round trip for the whole bell dropdown and the daily popup:
 * notifications + unread count + upcoming installments. Previously each
 * consumer fired its own action, each passing middleware and each calling
 * auth() separately. Upcoming installments are derived through the same
 * central engine as everything else (resolveSchedule -> computeSchedule).
 */
export async function getNotificationData(): Promise<NotificationData> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, notifications: [], unreadCount: 0, upcoming: [], error: "Unauthorized" };
    }

    const supabase = await createClient();

    const [notifRes, countRes, fundsRes] = await Promise.all([
      supabase
        .from("notifications_log")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("notifications_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false),
      supabase
        .from("fund_config")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true),
    ]);

    if (notifRes.error) {
      console.error("[getNotificationData] DB error:", notifRes.error);
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        upcoming: [],
        error: notifRes.error.message,
      };
    }

    const todayStr = nepalTodayAD();
    const upcoming: UpcomingInstallment[] = [];
    for (const f of ((fundsRes.data ?? []) as FundConfig[])) {
      const { sip } = resolveSchedule(f);
      const { nextDue, daysRemaining } = computeSchedule(sip, todayStr);
      upcoming.push({
        fundId: f.id,
        fundName: f.fund_name,
        nextDue,
        nextDueBS: sip.calendarSystem === "BS" ? formatBSDate(nextDue) : null,
        daysRemaining,
        amount: Number(f.monthly_sip),
      });
    }
    upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      success: true,
      notifications: (notifRes.data as AppNotification[]) || [],
      unreadCount: countRes.error ? 0 : countRes.count || 0,
      upcoming,
    };
  } catch (err: any) {
    console.error("[getNotificationData] error:", err);
    return { success: false, notifications: [], unreadCount: 0, upcoming: [], error: err?.message };
  }
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications_log")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications_log")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
