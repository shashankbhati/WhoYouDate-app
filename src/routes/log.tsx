import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { addEntry, getUserId, getProfile } from "@/lib/datedata/store";
import { ACTIVITY_META, MOOD_META, type Activity, type Mood } from "@/lib/datedata/types";
import { detectPII } from "@/lib/datedata/pii";
import { isRealUser, openAuthModal } from "@/lib/auth";
import { getCountryConfig } from "@/lib/country";
import { toast } from "sonner";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Log a Date — WhoAmIDating" },
      { name: "description", content: "Record a dating activity anonymously. Display names only — no PII." },
    ],
  }),
  component: LogDate,
});

const CURRENCIES = ["EUR", "USD", "INR", "GBP", "CHF"];
const MEET = [
  { id: "bumble", label: "🐝 Bumble" },
  { id: "hinge", label: "⚙️ Hinge" },
  { id: "tinder", label: "🔥 Tinder" },
  { id: "friends", label: "👥 Through friends" },
  { id: "work", label: "🏢 Work / School" },
  { id: "irl", label: "🌍 Met in person" },
  { id: "app", label: "📱 Other app" },
  { id: "other", label: "💫 Other" },
];
const SECOND = [
  { id: "yes" as const, label: "✅ Yes!", sub: "Would go again" },
  { id: "no" as const, label: "❌ No", sub: "Not feeling it" },
  { id: "together" as const, label: "💗 Together", sub: "Already a couple" },
];

function LogDate() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(() => getCountryConfig().defaultCurrency);
  const [partner, setPartner] = useState("");
  const [meet, setMeet] = useState<string | undefined>();
  const [mood, setMood] = useState<Mood | null>(null);
  const [second, setSecond] = useState<typeof SECOND[number]["id"] | undefined>();

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isRealUser()) {
      openAuthModal("Sign in to log your dates and track your history.");
      return;
    }
    if (!activity) return toast.error("Pick an activity.");
    if (!amount || isNaN(+amount)) return toast.error("Enter an amount.");
    if (!partner.trim()) return toast.error("Add a partner display name.");
    if (!mood) return toast.error("Pick an overall vibe.");
    const pii = detectPII(partner);
    if (pii) return toast.error(`Looks like you included a ${pii}. Use a nickname only.`);
    const profile = getProfile();
    addEntry({
      id: Math.random().toString(36).slice(2),
      userId: getUserId(),
      activity,
      amountCents: Math.round(+amount * 100),
      currency,
      partnerName: partner.trim(),
      mood,
      meetVia: meet,
      secondDate: second,
      city: profile?.city ?? getCountryConfig().defaultCity,
      entryDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    toast.success("Date logged anonymously 🎉");
    navigate({ to: "/stats" });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Log a Date</h1>
      <p className="text-muted-foreground mt-1">Record your dating activity anonymously</p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <Field label="Activity" required>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(ACTIVITY_META) as [Activity, { label: string; emoji: string }][]).map(([k, m]) => (
              <PickButton key={k} active={activity === k} onClick={() => setActivity(k)}>
                {m.emoji} {m.label}
              </PickButton>
            ))}
          </div>
        </Field>

        <div className="grid sm:grid-cols-[1fr_140px] gap-4">
          <Field label="Amount" required>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Partner Display Name" required>
          <input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Nickname only, e.g. Sam, Luna..." className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </Field>

        <Field label="How did you meet?" optional>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEET.map((m) => (
              <PickButton key={m.id} active={meet === m.id} onClick={() => setMeet(meet === m.id ? undefined : m.id)}>{m.label}</PickButton>
            ))}
          </div>
        </Field>

        <Field label="Overall vibe?" required>
          <div className="grid grid-cols-5 gap-3">
            {([5, 4, 3, 2, 1] as Mood[]).map((m) => {
              const meta = MOOD_META[m];
              return (
                <button key={m} type="button" onClick={() => setMood(m)} className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition ${mood === m ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}>
                  <span className="text-3xl">{meta.emoji}</span>
                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Want a second date?" optional>
          <div className="grid grid-cols-3 gap-3">
            {SECOND.map((s) => (
              <button key={s.id} type="button" onClick={() => setSecond(second === s.id ? undefined : s.id)} className={`rounded-xl border p-4 text-center transition ${second === s.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              </button>
            ))}
          </div>
        </Field>

        <button type="submit" className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition">Log this date 🎉</button>
      </form>
    </main>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold block mb-3">
        {label}{required && <span className="text-primary"> *</span>}
        {optional && <span className="text-muted-foreground font-normal"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

function PickButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
      {children}
    </button>
  );
}