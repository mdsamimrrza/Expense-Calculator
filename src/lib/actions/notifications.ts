"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";

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

export async function getLatestNotifications(): Promise<{
  success: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, notifications: [], unreadCount: 0, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // Fetch latest 4 notifications
    const { data: notifications, error } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.error("[getLatestNotifications] DB error:", error);
      return { success: false, notifications: [], unreadCount: 0, error: error.message };
    }

    // Count unread
    const { count, error: countErr } = await supabase
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    const unreadCount = countErr ? 0 : count || 0;

    return {
      success: true,
      notifications: (notifications as AppNotification[]) || [],
      unreadCount,
    };
  } catch (err: any) {
    console.error("[getLatestNotifications] error:", err);
    return { success: false, notifications: [], unreadCount: 0, error: err?.message };
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
