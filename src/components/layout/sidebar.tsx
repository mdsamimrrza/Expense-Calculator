"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  TrendingUp,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { Logo } from "@/components/ui/logo";
import { UserAvatarMenu } from "./user-avatar-menu";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Projections", href: "/projections", icon: TrendingUp },
  { label: "Tax & Settlement", href: "/tax-breakdown", icon: Receipt },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onSignOut: () => void;
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ onSignOut, userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card">
      {/* Logo / App name & Theme Toggle / Notifications */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>


      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: User Profile Card */}
      <div className="px-3 py-4 border-t border-border/50">
        <UserAvatarMenu
          userEmail={userEmail}
          userName={userName}
          onSignOut={onSignOut}
          variant="full-card"
        />
      </div>
    </aside>
  );
}
