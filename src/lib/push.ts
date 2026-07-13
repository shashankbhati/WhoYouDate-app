import { supabase } from "./supabase";

// Web Push (client side): subscribe the browser and store the subscription so the
// server can ping this user when their date replies / accepts / reacts.
// Dormant until VITE_VAPID_PUBLIC_KEY is set — pushSupported() returns false, so
// the UI simply doesn't offer it.
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC
  );
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "unsupported" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "denied" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) as unknown as BufferSource,
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "login" };
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: user.id, endpoint: sub.endpoint, subscription: sub.toJSON() },
        { onConflict: "endpoint" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
}
