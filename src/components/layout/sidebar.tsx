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

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Projections", href: "/projections", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onSignOut: () => void;
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card">
      {/* Logo / App name */}
      <div className="flex items-center h-16 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold transition-transform group-hover:scale-105">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
      </div>

      <Separator />

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
      <div className="px-3 py-4 space-y-2">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-muted-foreground hover:text-destructive"
            id="sidebar-signout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
