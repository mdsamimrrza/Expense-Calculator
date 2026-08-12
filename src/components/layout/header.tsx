"use client";

import { APP_NAME } from "@/lib/constants";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
  onSignOut?: () => void;
  userEmail?: string;
}

export function Header({ title, onSignOut, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border/60 bg-card/95 backdrop-blur-sm lg:hidden">
      {title ? (
        <span className="text-base font-semibold">{title}</span>
      ) : (
        <Link href="/dashboard">
          <Logo />
        </Link>
      )}
      <div className="flex items-center gap-2">
        {userEmail && (
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px] mr-1 font-medium bg-secondary/50 px-2 py-1 rounded-full border border-border/50">
            {userEmail}
          </span>
        )}
        <ThemeToggle />
        {onSignOut && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            title="Sign Out"
            id="mobile-header-signout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
