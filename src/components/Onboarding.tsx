import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

// A one-time, skippable 3-card intro shown on first visit — shows what's possible
// and points at the first action. Gated by localStorage so it's shown once.
const KEY = "wad_onboarded";
const CARDS = [
  {
    emoji: "💸",
    title: "See what dating really costs",
    body: "Real spend from real dates in your city — no more guessing.",
  },
  {
    emoji: "✨",
    title: "Plan a date in 30 seconds",
    body: "Tell us who, where, and the vibe — get a full date, mapped out.",
  },
  {
    emoji: "💌",
    title: "Share it with your date",
    body: "Send the plan, react, chat, and lock it in — together.",
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode */
    }
  }, []);

  function done() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setShow(false);
  }

  if (!show) return null;
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex justify-end p-4 pt-safe">
        <button onClick={done} className="text-sm font-medium text-white/70 hover:text-white">
          Skip
        </button>
      </div>

      <div className="mt-auto p-4 pb-safe">
        <div className="mx-auto w-full max-w-md rounded-[28px] bg-[color:var(--color-reel-surface)] p-7 text-white shadow-2xl ring-1 ring-white/10">
          <div className="text-5xl">{card.emoji}</div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance">{card.title}</h2>
          <p className="mt-2 text-sm text-white/70">{card.body}</p>

          <div className="mt-7 flex items-center justify-between">
            <div className="flex gap-1.5">
              {CARDS.map((_, k) => (
                <span
                  key={k}
                  className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-1.5 bg-white/25"}`}
                />
              ))}
            </div>
            {last ? (
              <Link
                to="/plan"
                onClick={done}
                className="rounded-full bg-[color:var(--color-reel-rose)] px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90"
              >
                Plan a date →
              </Link>
            ) : (
              <button
                onClick={() => setI(i + 1)}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
