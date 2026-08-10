"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Projections", href: "/projections", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`tab-${item.label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-lg transition-all duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
