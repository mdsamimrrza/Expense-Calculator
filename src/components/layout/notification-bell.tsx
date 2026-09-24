"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Check, CheckCheck, Clock, ExternalLink, X, Sparkles, Inbox } from "lucide-react";
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
import { getUpcomingInstallments } from "@/lib/actions/upcoming";
import { formatCurrencyWhole, formatDate } from "@/lib/format";
import type { UpcomingInstallment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const DISMISSED_KEY = "sahakari-dismissed-upcoming";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissInstallment(fundId: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getDismissed();
    current.add(fundId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current]));
  } catch {}
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingInstallment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch on mount / open
  const fetchNotifications = async () => {
    const [res, upcomingRes] = await Promise.all([
      getLatestNotifications(),
      getUpcomingInstallments(),
    ]);
    if (res.success) {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    }
    setUpcoming(upcomingRes);
  };

  useEffect(() => {
    setDismissed(getDismissed());
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setDismissed(getDismissed());
      fetchNotifications();
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      startTransition(async () => {
        await markNotificationAsRead(notif.id);
      });
    }
    setIsOpen(false);
    if (notif.url) router.push(notif.url);
  };

  const handleDismissUpcoming = (fundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissInstallment(fundId);
    setDismissed((prev) => new Set([...prev, fundId]));
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  // Build merged list: upcoming first (undismissed), then real notifications
  const merged = [
    ...upcoming
      .filter((u) => !dismissed.has(u.fundId))
      .map((u) => ({
        type: "upcoming" as const,
        id: `upcoming-${u.fundId}`,
        fundId: u.fundId,
        title: u.fundName,
        body: `${formatDate(u.nextDue)}${u.nextDueBS ? ` · ${u.nextDueBS} BS` : ""} · ${formatCurrencyWhole(u.amount)}`,
        daysRemaining: u.daysRemaining,
        isRead: false,
        createdAt: new Date().toISOString(),
      })),
    ...notifications.map((n) => ({
      type: "notification" as const,
      id: n.id,
      title: n.title,
      body: n.body,
      isRead: n.is_read,
      createdAt: n.created_at,
      url: n.url,
    })),
  ];

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

        {/* Merged List */}
        <div className="max-h-[360px] divide-y divide-border/30 overflow-y-auto">
          {merged.length === 0 ? (
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
            merged.map((item) => {
              let relativeTime = "recently";
              try {
                relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
              } catch (e) {}

              const isUpcoming = item.type === "upcoming";

              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={isUpcoming ? undefined : () => handleItemClick(item as any)}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors focus:bg-secondary/60 ${
                    isUpcoming
                      ? "bg-primary/5 hover:bg-primary/10"
                      : item.isRead
                        ? "opacity-75 hover:opacity-100"
                        : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  {/* Leading icon / status */}
                  <div className="shrink-0 mt-0.5 flex items-center gap-1">
                    {isUpcoming ? (
                      <>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.daysRemaining === 0
                              ? "bg-red-500/15 text-red-500"
                              : item.daysRemaining <= 2
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-emerald-500/15 text-emerald-500"
                          }`}
                        >
                          {item.daysRemaining === 0
                            ? "Today"
                            : item.daysRemaining === 1
                              ? "Tomorrow"
                              : `${item.daysRemaining}d`}
                        </span>
                        <button
                          onClick={(e) => handleDismissUpcoming(item.fundId, e)}
                          className="p-0.5 text-muted-foreground hover:text-rose-500 transition-colors"
                          aria-label="Dismiss this installment reminder"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : item.isRead ? (
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
                          isUpcoming || !item.isRead ? "font-extrabold" : "font-semibold"
                        } text-foreground`}
                      >
                        {item.title}
                      </h5>
                      {!isUpcoming && !item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.body}
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