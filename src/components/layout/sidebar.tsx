"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "@/components/ui/logo";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Projections", href: "/projections", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onSignOut: () => void;
  userEmail?: string;
}

export function Sidebar({ onSignOut, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card">
      {/* Logo / App name & Theme Toggle */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Logo />
        </Link>
        <ThemeToggle />
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

      {/* Bottom section */}
      <div className="px-3 py-4">
        {userEmail && (
          <div className="px-3 mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <p className="text-xs text-muted-foreground truncate font-medium" title={userEmail}>
              {userEmail}
            </p>
          </div>
        )}
        <Separator className="mb-3" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive px-3 h-10"
          id="sidebar-signout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
