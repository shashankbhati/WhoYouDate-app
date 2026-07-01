import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { subscribe } from "@/lib/datedata/store";

/**
 * Email opt-in for the weekly digest and/or watch-a-name notifications.
 * - mode "digest": general weekly community digest signup (sidebar).
 * - mode "watch":  watch a specific name; `watchName` is prefilled.
 * GDPR: explicit action (user types + clicks), clear purpose, unsubscribe
 * promised in every email. We store only the email + optional watched name.
 */
export function NotifyOptIn({ mode = "digest", watchName }: { mode?: "digest" | "watch"; watchName?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await subscribe({
      email,
      watchName: mode === "watch" ? watchName : undefined,
      wantsDigest: mode === "digest",
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error ?? "Something went wrong.");
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-green-500">
          <Check className="h-5 w-5" />
          <span className="font-semibold text-sm">You're on the list</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === "watch"
            ? <>We'll email you when new dates with a <span className="font-medium text-foreground">{watchName}</span> are logged.</>
            : "We'll send you the weekly community digest. Unsubscribe anytime from any email."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">
          {mode === "watch" ? <>Watch the name "{watchName}"</> : "Weekly dating digest"}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {mode === "watch"
          ? "Get an email when someone logs a new date with a person by this name. Fully anonymous — never who."
          : "One email a week: trending names, the week's spiciest stories, and fresh community stats. 👀"}
      </p>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-full bg-input border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {busy ? "…" : mode === "watch" ? "Notify me" : "Get the digest"}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <p className="text-[11px] text-muted-foreground/70 mt-2 leading-snug">
        We only store your email to send this. Unsubscribe in one click, anytime.{" "}
        <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>.
      </p>
    </div>
  );
}
