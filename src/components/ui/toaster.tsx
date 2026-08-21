"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Sparkles, Bell } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive";
        const titleStr = typeof title === "string" ? title : "";
        const isPushOrAlert = titleStr.includes("🔔") || titleStr.includes("📲") || titleStr.includes("Reminder");

        return (
          <Toast key={id} variant={variant} {...props} className="relative group overflow-hidden">
            {/* Top Accent Gradient Bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                isDestructive
                  ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600"
                  : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
              }`}
            />

            <div className="flex items-start gap-3.5 w-full min-w-0 pt-0.5">
              {/* Status Icon */}
              <div className="shrink-0 mt-0.5">
                {isDestructive ? (
                  <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-sm shadow-rose-500/10">
                    <AlertCircle className="h-4 w-4 stroke-[2.5]" />
                  </div>
                ) : isPushOrAlert ? (
                  <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-sm shadow-amber-500/10">
                    <Bell className="h-4 w-4 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="grid gap-0.5 flex-1 min-w-0 pr-2">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>

            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
