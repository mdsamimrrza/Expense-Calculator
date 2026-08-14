"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ChevronUp, Clock } from "lucide-react";
import Link from "next/link";

interface UserAvatarMenuProps {
  userEmail?: string;
  userName?: string;
  onSignOut?: () => void;
  variant?: "avatar-only" | "full-card";
}

export function UserAvatarMenu({
  userEmail,
  userName,
  onSignOut,
  variant = "avatar-only",
}: UserAvatarMenuProps) {
  const [loginTime, setLoginTime] = useState<string>("");
  const displayEmail = userEmail || "User";

  // Format clean display name (e.g. samimrrza1@gmail.com -> Samimrrza1)
  const rawName = userName || (userEmail ? userEmail.split("@")[0] : "User");
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    // Format session login timestamp
    const now = new Date();
    const formatted = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = now.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    setLoginTime(`${dateStr} at ${formatted}`);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "avatar-only" ? (
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-black text-xs shadow-md shadow-emerald-500/20 border border-emerald-400/30 hover:scale-105 transition-transform shrink-0 flex items-center justify-center"
            title={`${displayName} (${displayEmail})`}
            id="user-avatar-trigger-mobile"
          >
            {initial}
          </Button>
        ) : (
          <button
            className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors shadow-sm text-left group"
            id="user-avatar-trigger-sidebar"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                {initial}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-extrabold text-foreground block truncate" title={displayName}>
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium block truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 rounded-2xl p-2 shadow-xl border-border/60 bg-card"
        align={variant === "avatar-only" ? "end" : "start"}
        sideOffset={8}
      >
        {/* User Details Header */}
        <div className="flex items-center gap-3 p-2.5 bg-secondary/40 rounded-xl border border-border/40 mb-1">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0">
            {initial}
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-extrabold text-foreground block truncate">{displayName}</span>
            <span className="text-[11px] text-muted-foreground font-medium block truncate">
              {displayEmail}
            </span>
          </div>
        </div>

        {/* Session Timestamp Info */}
        {loginTime && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary/20 border border-border/30 my-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Session Active Since
              </span>
              <span className="text-xs font-bold text-foreground block font-mono">
                {loginTime}
              </span>
            </div>
          </div>
        )}

        <DropdownMenuSeparator className="my-1" />

        {/* Quick Link to Settings */}
        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 font-semibold text-xs">
          <Link href="/settings" className="flex items-center gap-2 text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Account Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* Logout Action */}
        {onSignOut && (
          <DropdownMenuItem
            onClick={onSignOut}
            className="rounded-xl cursor-pointer py-2 font-bold text-xs text-rose-500 focus:bg-rose-500/10 focus:text-rose-500"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
