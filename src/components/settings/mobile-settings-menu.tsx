"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TINT_STYLES, type SettingsTint } from "@/lib/settings-sections";
import { cn } from "@/lib/utils";

// ---------- Group ----------

export function MobileSettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="border-b border-border px-4 pt-3 pb-2 text-sm font-semibold text-foreground">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

// ---------- Row ----------

interface MobileSettingsRowProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: string;
  destructive?: boolean;
  last?: boolean;
  /** Accent color for the icon tile — kept subtle in light mode, glowing in dark mode. */
  tint?: SettingsTint;
}

export function MobileSettingsRow({
  href,
  icon,
  label,
  subtitle,
  badge,
  destructive,
  last,
  tint,
}: MobileSettingsRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 active:bg-secondary/60",
        !last && "border-b border-border"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
          tint ? TINT_STYLES[tint] : "bg-secondary text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {badge && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

// ---------- Profile hero ----------

export function MobileProfileHero({
  userName,
  userEmail,
  userImage,
  fundCount,
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
  fundCount: number;
}) {
  return (
    <Link
      href="/settings/profile"
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-secondary/60"
      aria-label="Open profile settings"
    >
      <Avatar
        src={userImage}
        name={userName}
        className="h-12 w-12 shrink-0 rounded-full text-sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {userName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {userEmail}
        </span>
        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {fundCount} {fundCount === 1 ? "fund" : "funds"}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

// ---------- Detail header (< Title) ----------

export function MobileDetailHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();

  function handleBack() {
    // Deterministic parent navigation like the APK: always land back
    // on the settings hub instead of leaking onto another tab.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/settings");
    }
  }

  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-2 py-1 backdrop-blur-sm sm:-mx-6">
      <div className="flex min-h-[42px] items-center">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to settings"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <div className="min-w-0 flex-1 pr-10 text-center">
          <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
