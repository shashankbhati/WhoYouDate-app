import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { useMySharedPlans } from "@/lib/dateplan/inbox";
import type { SharedPlan } from "@/lib/dateplan/share";

export const Route = createFileRoute("/dates")({
  head: () => ({
    meta: [
      { title: "Your shared dates | WhoAmIDating" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyDatesPage,
});

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function MyDatesPage() {
  const { isReal } = useAuthState();
  const plans = useMySharedPlans(isReal);

  if (!isReal) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-4xl">💌</p>
        <h1 className="mt-3 text-2xl font-bold">Your shared dates</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to see the dates you've planned and shared.
        </p>
        <button
          onClick={() => openAuthModal("Sign in to see your shared dates.")}
          className="mt-5 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your shared dates</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone you've sent a plan to — and where it stands.
      </p>

      {plans.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-3xl">💌</p>
          <p className="mt-3 font-semibold">No shared dates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan a date and hit Share — it'll show up here.
          </p>
          <Link
            to="/plan"
            className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Plan a date →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {plans.map((p) => (
            <DateRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function DateRow({ p }: { p: SharedPlan }) {
  const who = p.recipientName || (p.status === "pending" ? "Not opened yet" : "Your date");
  const unread =
    !!p.updatedAt &&
    (!p.ownerSeenAt || +new Date(p.updatedAt) > +new Date(p.ownerSeenAt)) &&
    p.lastActor !== p.ownerName;
  const statusMeta =
    p.status === "accepted"
      ? { label: "Accepted", cls: "border-primary/40 bg-primary/10 text-primary" }
      : p.status === "changed"
        ? { label: "Edited", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600" }
        : { label: "Pending", cls: "border-border bg-muted text-muted-foreground" };
  const lastMsg = p.messages?.length ? p.messages[p.messages.length - 1] : undefined;

  return (
    <li>
      <Link
        to="/p/$id"
        params={{ id: p.id }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl">
          {p.status === "accepted" ? "💗" : "💌"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{who}</p>
            {unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {p.city}
            {p.date ? ` · ${fmtDate(p.date)}` : ""}
            {lastMsg ? ` · "${lastMsg.text.slice(0, 40)}"` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}
        >
          {statusMeta.label}
        </span>
      </Link>
    </li>
  );
}
