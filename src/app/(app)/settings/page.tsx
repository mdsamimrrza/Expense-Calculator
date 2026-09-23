import type { Metadata } from "next";
import Link from "next/link";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { getProfile } from "@/lib/actions/profile";
import { getEntries } from "@/lib/actions/entries";
import { createClient } from "@/lib/supabase/server";
import { displayNameFor } from "@/lib/utils";
import {
  SETTINGS_SECTIONS,
  TINT_STYLES,
  type SettingsSection,
} from "@/lib/settings-sections";
import {
  MobileSettingsGroup,
  MobileSettingsRow,
  MobileProfileHero,
} from "@/components/settings/mobile-settings-menu";
import { Avatar } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const [fundsRes, session, profile, entriesRes] = await Promise.all([
    getFundConfigs(),
    auth(),
    getProfile(),
    getEntries({ pageSize: 1 }),
  ]);

  if (!fundsRes.success || !fundsRes.data) {
    redirect("/onboarding");
  }

  const funds = fundsRes.data;
  // Live DB values first (never stale), session as fallback.
  const userEmail = profile.email ?? session?.user?.email ?? "Authenticated User";
  const userName = displayNameFor(profile.name ?? session?.user?.name, userEmail);
  const userImage = profile.image ?? session?.user?.image ?? null;

  // Reminder channel state for the overview card.
  let emailEnabled = true;
  if (session?.user?.id) {
    const supabase = await createClient();
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (prefs) emailEnabled = Boolean(prefs.email_enabled);
  }

  const entryCount = entriesRes.success ? entriesRes.data?.total ?? 0 : 0;

  const stateFor = (s: SettingsSection): string | undefined => {
    switch (s.href) {
      case "/settings/profile":
        return userEmail;
      case "/settings/funds":
        return `${funds.length} ${funds.length === 1 ? "fund" : "funds"}`;
      case "/settings/notifications":
        return `Email ${emailEnabled ? "on" : "off"}`;
      case "/settings/danger":
        return `${funds.length} funds · ${entryCount} entries`;
      default:
        return undefined;
    }
  };

  const settingsRows = SETTINGS_SECTIONS.filter((s) => s.group === "settings");
  const accountRows = SETTINGS_SECTIONS.filter((s) => s.group === "account");
  const overviewCards = SETTINGS_SECTIONS.filter((s) => s.group !== "overview");

  return (
    <>
      {/* ── Mobile: nested hub (like the APK) ─────────────────── */}
      <div className="mx-auto flex w-full max-w-md animate-fade-in flex-col gap-3 pb-20 min-h-[calc(100dvh-10rem)] lg:hidden">
        <h1 className="pt-1 text-center text-lg font-bold text-foreground">
          Settings
        </h1>

        <MobileProfileHero
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          fundCount={funds.length}
        />

        <MobileSettingsGroup title="Settings">
          {settingsRows.map((s, i) => (
            <MobileSettingsRow
              key={s.href}
              href={s.href}
              icon={<s.icon className="h-[18px] w-[18px]" strokeWidth={2} />}
              label={s.label}
              subtitle={s.description}
              badge={s.href === "/settings/funds" ? `${funds.length}` : undefined}
              tint={s.tint}
              last={i === settingsRows.length - 1}
            />
          ))}
        </MobileSettingsGroup>

        <MobileSettingsGroup title="Account">
          {accountRows.map((s, i) => (
            <MobileSettingsRow
              key={s.href}
              href={s.href}
              icon={<s.icon className="h-[18px] w-[18px]" strokeWidth={2} />}
              label={s.label}
              subtitle={s.description}
              destructive={s.destructive}
              tint={s.tint}
              last={i === accountRows.length - 1}
            />
          ))}
        </MobileSettingsGroup>
      </div>

      {/* ── Desktop: General overview ─────────────────────────── */}
      <div className="mx-auto hidden w-full max-w-3xl animate-fade-in flex-col gap-6 pb-10 lg:flex">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            General
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account at a glance. Pick a section from the left.
          </p>
        </div>

        {/* Profile summary */}
        <Link
          href="/settings/profile"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <Avatar
            src={userImage}
            name={userName}
            className="h-14 w-14 shrink-0 rounded-full text-base"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {userName}
            </p>
            <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {funds.length} {funds.length === 1 ? "fund" : "funds"}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Section cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {overviewCards.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                  s.destructive
                    ? "border-destructive/30 hover:border-destructive/60"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
                    TINT_STYLES[s.tint]
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      s.destructive ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {stateFor(s) ?? s.description}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
