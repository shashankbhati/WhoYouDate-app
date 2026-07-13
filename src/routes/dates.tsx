import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { useStore } from "@/lib/datedata/store";
import { useSharedInbox } from "@/lib/dateplan/inbox";
import type { SharedPlan } from "@/lib/dateplan/share";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/dates")({
  head: () => ({
    meta: [
      { title: "Your dates | WhoAmIDating" },
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
  const { profile } = useStore();
  const { sent, received } = useSharedInbox(isReal);
  const myName = profile?.displayName ?? "";

  if (!isReal) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center pt-safe">
          <p className="text-4xl">💌</p>
          <h1 className="mt-3 text-2xl font-bold">Your dates</h1>
          <p className="mt-2 text-sm text-white/60">
            Sign in to see the dates you've planned and the ones shared with you.
          </p>
          <button
            onClick={() => openAuthModal("Sign in to see your dates.")}
            className="mt-5 rounded-full bg-[color:var(--color-reel-rose)] px-6 py-2.5 font-semibold text-neutral-950 transition hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </AppShell>
    );
  }

  const empty = sent.length === 0 && received.length === 0;

  return (
    <AppShell>
      <div className="px-5 py-6 pt-safe text-white">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your plans</h1>
            <p className="mt-1 text-sm text-white/55">Shared with you & sent by you.</p>
          </div>
          <Link
            to="/plan"
            className="shrink-0 rounded-full bg-[color:var(--color-reel-rose)] px-4 py-2 text-sm font-semibold text-neutral-950"
          >
            + Plan
          </Link>
        </div>

      {empty ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-3xl">💌</p>
          <p className="mt-3 font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan a date and hit Share — it'll show up here, and so will dates people share with you.
          </p>
          <Link
            to="/plan"
            className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Plan a date →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {received.length > 0 && (
            <Section title="Shared with you" plans={received} mine={false} myName={myName} />
          )}
          {sent.length > 0 && (
            <Section title="You shared" plans={sent} mine={true} myName={myName} />
          )}
        </div>
      )}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  plans,
  mine,
  myName,
}: {
  title: string;
  plans: SharedPlan[];
  mine: boolean;
  myName: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-3">
        {plans.map((p) => (
          <DateRow key={p.id} p={p} mine={mine} myName={myName} />
        ))}
      </ul>
    </section>
  );
}

function DateRow({ p, mine, myName }: { p: SharedPlan; mine: boolean; myName: string }) {
  const who = mine
    ? p.recipientName || (p.status === "pending" ? "Not opened yet" : "Your date")
    : p.ownerName || "Someone";
  const seenAt = mine ? p.ownerSeenAt : p.recipientSeenAt;
  const unread =
    !!p.updatedAt &&
    (!seenAt || +new Date(p.updatedAt) > +new Date(seenAt)) &&
    p.lastActor !== myName;
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
