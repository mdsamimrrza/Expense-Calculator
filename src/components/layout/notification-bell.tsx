"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Check, CheckCheck, Clock, ExternalLink, Sparkles, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  getLatestNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Fetch notifications on mount and when dropdown opens
  const fetchNotifications = async () => {
    const res = await getLatestNotifications();
    if (res.success) {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Server update
      startTransition(async () => {
        await markNotificationAsRead(notif.id);
      });
    }

    setIsOpen(false);
    if (notif.url) {
      router.push(notif.url);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm shadow-rose-500/50 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] rounded-2xl p-0 shadow-2xl border-border/60 bg-card/95 backdrop-blur-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-secondary/30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* Notifications List (Max 4 items) */}
        <div className="max-h-[360px] divide-y divide-border/30 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-10 w-10 rounded-2xl bg-secondary/60 text-muted-foreground flex items-center justify-center mb-2.5">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-foreground">No notifications yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your monthly installment reminders will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              let relativeTime = "recently";
              try {
                relativeTime = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true });
              } catch (e) {}

              return (
                <DropdownMenuItem
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors focus:bg-secondary/60 ${
                    notif.is_read ? "opacity-75 hover:opacity-100" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  {/* Unread indicator / Icon */}
                  <div className="shrink-0 mt-0.5">
                    {notif.is_read ? (
                      <div className="h-7 w-7 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center text-xs">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center text-xs shadow-sm">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5
                        className={`text-xs truncate ${
                          notif.is_read ? "font-semibold text-foreground" : "font-extrabold text-foreground"
                        }`}
                      >
                        {notif.title}
                      </h5>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{relativeTime}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-border/40 bg-secondary/20 flex items-center justify-center">
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/settings");
            }}
            className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1"
          >
            Notification Settings <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
