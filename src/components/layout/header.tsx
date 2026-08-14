"use client";

import { ThemeToggle } from "./theme-toggle";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { UserAvatarMenu } from "./user-avatar-menu";

interface HeaderProps {
  title?: string;
  onSignOut?: () => void;
  userEmail?: string;
  userName?: string;
}

export function Header({ title, onSignOut, userEmail, userName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border/60 bg-card/95 backdrop-blur-sm lg:hidden">
      {title ? (
        <span className="text-base font-semibold">{title}</span>
      ) : (
        <Link href="/dashboard">
          <Logo />
        </Link>
      )}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <UserAvatarMenu userEmail={userEmail} userName={userName} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
