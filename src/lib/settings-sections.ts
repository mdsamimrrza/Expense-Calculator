import {
  AlertTriangle,
  Bell,
  Building2,
  LayoutGrid,
  Smartphone,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsTint = "emerald" | "violet" | "amber" | "sky" | "rose" | "blue";

/** Icon-tile colors shared by the mobile hub, desktop sub-nav, and overview cards. */
export const TINT_STYLES: Record<SettingsTint, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export interface SettingsSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tint: SettingsTint;
  /** Hub grouping on mobile; "overview" is the desktop General page itself. */
  group: "overview" | "settings" | "account";
  destructive?: boolean;
}

/** Single source of truth for settings navigation — hub rows, desktop nav, and overview cards all read this. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    href: "/settings",
    label: "General",
    description: "Account overview and quick links",
    icon: LayoutGrid,
    tint: "blue",
    group: "overview",
  },
  {
    href: "/settings/profile",
    label: "Profile",
    description: "Your details, photo, and fund name",
    icon: User,
    tint: "emerald",
    group: "settings",
  },
  {
    href: "/settings/funds",
    label: "My Funds",
    description: "Add, edit, or remove tracked funds",
    icon: Building2,
    tint: "violet",
    group: "settings",
  },
  {
    href: "/settings/notifications",
    label: "Reminders",
    description: "Push reminders and email summaries",
    icon: Bell,
    tint: "amber",
    group: "settings",
  },
  {
    href: "/settings/android-app",
    label: "Android App",
    description: "Free APK download",
    icon: Smartphone,
    tint: "sky",
    group: "settings",
  },
  {
    href: "/settings/danger",
    label: "Danger Zone",
    description: "Delete account and data",
    icon: AlertTriangle,
    tint: "rose",
    group: "account",
    destructive: true,
  },
];
