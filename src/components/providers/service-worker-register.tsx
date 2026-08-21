"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[ServiceWorker] Registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.error("[ServiceWorker] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
