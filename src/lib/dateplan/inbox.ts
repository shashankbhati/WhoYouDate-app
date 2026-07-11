import { useEffect, useState } from "react";
import type { Notif } from "../datedata/notifications";
import { listMySharedPlans, type SharedPlan } from "./share";

// The owner's shared plans, refreshed on mount + a light poll — feeds both the
// "My dates" inbox and the header bell. Returns [] when not logged in.
export function useMySharedPlans(enabled = true, pollMs = 45000): SharedPlan[] {
  const [plans, setPlans] = useState<SharedPlan[]>([]);
  useEffect(() => {
    if (!enabled) {
      setPlans([]);
      return;
    }
    let alive = true;
    const load = async () => {
      const p = await listMySharedPlans();
      if (alive) setPlans(p);
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, pollMs]);
  return plans;
}

function fmtShort(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// Turn the owner's shared plans into bell notifications for activity from the
// OTHER side (new message / accepted / edited). Skips plans whose last action was
// the owner's own, and plans with no activity yet.
export function sharedPlanNotifications(plans: SharedPlan[], myName: string): Notif[] {
  const out: Notif[] = [];
  for (const p of plans) {
    if (!p.updatedAt) continue;
    if (myName && p.lastActor && p.lastActor === myName) continue; // my own last action
    const who = p.recipientName || p.lastActor || "Your date";
    const ts = +new Date(p.updatedAt);
    const where = `${p.city}${p.date ? " · " + fmtShort(p.date) : ""}`;
    const lastMsg = p.messages && p.messages.length ? p.messages[p.messages.length - 1] : undefined;

    if (lastMsg && !lastMsg.owner) {
      out.push({
        id: "sp-m-" + p.id,
        icon: "💬",
        title: `${who} messaged you`,
        sub: `"${lastMsg.text.slice(0, 50)}"`,
        ts,
        countsUnread: true,
      });
    } else if (p.status === "accepted") {
      out.push({
        id: "sp-a-" + p.id,
        icon: "💗",
        title: `${who} accepted your date`,
        sub: where,
        ts,
        countsUnread: true,
      });
    } else if (p.status === "changed") {
      out.push({
        id: "sp-c-" + p.id,
        icon: "✏️",
        title: `${who} tweaked your date`,
        sub: where,
        ts,
        countsUnread: true,
      });
    }
  }
  return out;
}
