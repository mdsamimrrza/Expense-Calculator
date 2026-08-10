"use client";

import { APP_NAME } from "@/lib/constants";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-card/95 backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          S
        </div>
        <span className="text-base font-semibold">
          {title || APP_NAME}
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
}
