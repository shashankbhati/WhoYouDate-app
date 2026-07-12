import { useEffect, useState } from "react";
import type { Notif } from "../datedata/notifications";
import { listMySharedPlans, listReceivedSharedPlans, type SharedPlan } from "./share";

export interface SharedInbox {
  sent: SharedPlan[]; // plans I shared (I'm the owner)
  received: SharedPlan[]; // plans shared with me (I opened them)
}

// Both sides of "My dates", refreshed on mount + a light poll. Returns empty
// lists when not logged in.
export function useSharedInbox(enabled = true, pollMs = 45000): SharedInbox {
  const [inbox, setInbox] = useState<SharedInbox>({ sent: [], received: [] });
  useEffect(() => {
    if (!enabled) {
      setInbox({ sent: [], received: [] });
      return;
    }
    let alive = true;
    const load = async () => {
      const [sent, received] = await Promise.all([
        listMySharedPlans(),
        listReceivedSharedPlans(),
      ]);
      if (alive) setInbox({ sent, received });
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, pollMs]);
  return inbox;
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

// Turn a set of shared plans into bell notifications for activity from the OTHER
// side. `iAmOwner` says which side I'm on for this list (sent vs received), which
// flips who "the other person" is and which messages count. Skips plans whose
// last action was mine, and plans with no activity yet.
export function sharedPlanNotifications(
  plans: SharedPlan[],
  iAmOwner: boolean,
  myName: string,
): Notif[] {
  const out: Notif[] = [];
  for (const p of plans) {
    if (!p.updatedAt) continue;
    if (myName && p.lastActor && p.lastActor === myName) continue; // my own last action
    const other = iAmOwner
      ? p.recipientName || p.lastActor || "Your date"
      : p.ownerName || p.lastActor || "Your date";
    const ts = +new Date(p.updatedAt);
    const where = `${p.city}${p.date ? " · " + fmtShort(p.date) : ""}`;
    const lastMsg = p.messages && p.messages.length ? p.messages[p.messages.length - 1] : undefined;

    if (lastMsg && lastMsg.owner !== iAmOwner) {
      // last message came from the other side
      out.push({
        id: "sp-m-" + p.id,
        icon: "💬",
        title: `${other} messaged you`,
        sub: `"${lastMsg.text.slice(0, 50)}"`,
        ts,
        countsUnread: true,
      });
    } else if (iAmOwner && p.status === "accepted") {
      out.push({
        id: "sp-a-" + p.id,
        icon: "💗",
        title: `${other} accepted your date`,
        sub: where,
        ts,
        countsUnread: true,
      });
    } else if (p.status === "changed") {
      out.push({
        id: "sp-c-" + p.id,
        icon: "✏️",
        title: `${other} tweaked the date`,
        sub: where,
        ts,
        countsUnread: true,
      });
    } else if (hasOtherReaction(p, iAmOwner)) {
      out.push({
        id: "sp-r-" + p.id,
        icon: "💞",
        title: `${other} reacted to the date`,
        sub: where,
        ts,
        countsUnread: true,
      });
    }
  }
  return out;
}

function hasOtherReaction(p: SharedPlan, iAmOwner: boolean): boolean {
  const otherSide = iAmOwner ? "r" : "o";
  return Object.values(p.reactions ?? {}).some((e) => e && e[otherSide]);
}
