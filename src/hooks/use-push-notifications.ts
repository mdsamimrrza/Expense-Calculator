"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const { toast } = useToast();

  // Check support and current subscription status on mount
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker
        .register("/sw.js")
        .then(async (reg) => {
          setRegistration(reg);
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.error("[usePushNotifications] Service worker registration error:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this browser/device.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast({
          title: "Permission Denied",
          description: "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      const reg = registration || (await navigator.serviceWorker.ready);
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error("VAPID public key is missing");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error("Failed to extract push subscription keys");
      }

      // Save to backend
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subscription");
      }

      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled 🔔",
        description: "You will now receive installment reminders on this device.",
      });
      return true;
    } catch (err: any) {
      console.error("[usePushNotifications] Subscription error:", err);
      toast({
        title: "Subscription Failed",
        description: err?.message || "Could not enable push notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registration, toast]);

  const unsubscribeFromPush = useCallback(async () => {
    try {
      setIsLoading(true);
      const reg = registration || (await navigator.serviceWorker.ready);
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Delete from backend
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications on this device.",
      });
      return true;
    } catch (err: any) {
      console.error("[usePushNotifications] Unsubscribe error:", err);
      toast({
        title: "Failed to unsubscribe",
        description: err?.message || "An error occurred while disabling notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, toast]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
