import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm text-primary-foreground transition-transform group-hover:scale-105 duration-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {/* A sleek ascending bar chart representing growth and SIP */}
          <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.6"/>
          <rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" stroke="none" opacity="0.8"/>
          <rect x="17" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
          {/* An ascending line intersecting the bars */}
          <path d="M1 18l6-6 4 2 9-9" className="text-secondary" />
          <path d="M16 5h4v4" className="text-secondary" />
        </svg>
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
