"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/constants";

export function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if the app is launched in standalone mode (installed PWA)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setShow(true);
      // Hide the splash screen after 2.5 seconds (after the animation finishes)
      const timer = setTimeout(() => {
        setShow(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background animate-[fade-out_0.5s_ease-out_2s_forwards]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg text-primary-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-14 h-14"
          >
            {/* A sleek ascending bar chart representing growth and SIP */}
            <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.6" />
            <rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" stroke="none" opacity="0.8" />
            <rect x="17" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
            
            {/* Animated ascending line intersecting the bars */}
            <path d="M1 18l6-6 4 2 9-9" className="text-secondary animate-[draw-arrow_1.5s_ease-out_forwards]" strokeDasharray="30" strokeDashoffset="30" />
            <path d="M16 5h4v4" className="text-secondary animate-[fade-in_0.2s_ease-out_1.3s_forwards]" opacity="0" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground animate-[fade-in_0.5s_ease-out_0.5s_forwards] opacity-0">
          {APP_NAME}
        </h1>
      </div>
    </div>
  );
}
