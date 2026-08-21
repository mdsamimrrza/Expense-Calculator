import webpush from "web-push";

let vapidConfigured = false;

export function configureWebPush() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@sahakarisip.com";

  if (!publicKey || !privateKey) {
    console.warn("[web-push] VAPID keys not configured in environment variables.");
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[web-push] Error setting VAPID details:", err);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: PushNotificationPayload
): Promise<{ success: boolean; shouldDelete?: boolean; error?: string }> {
  const ready = configureWebPush();
  if (!ready) {
    return { success: false, error: "VAPID credentials not configured" };
  }

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    url: payload.url || "/dashboard",
    data: payload.data || {},
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationString);
    return { success: true };
  } catch (error: any) {
    console.error("[web-push] sendNotification error:", error);

    // HTTP 410 (Gone) or 404 (Not Found) means the push subscription is expired/unsubscribed
    const statusCode = error?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, shouldDelete: true, error: "Subscription expired" };
    }

    return {
      success: false,
      error: error?.message || "Failed to send push notification",
    };
  }
}
