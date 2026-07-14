import { Link, useRouterState } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";

// Full-screen phone-app frame with a native-style bottom tab bar + pull-to-refresh.
// Uses the same technique as the plan reel: fixed inset-0 over the website chrome,
// dark reel palette, safe-area aware. Tabs point at the real app routes.
const LEFT_TABS = [
  { to: "/", label: "Home", icon: "◐" },
  { to: "/dates", label: "Plans", icon: "◇" },
] as const;
const RIGHT_TABS = [
  { to: "/stats", label: "Dates", icon: "◉" },
  { to: "/profile", label: "You", icon: "☾" },
] as const;

const THRESHOLD = 64; // px pulled before a release triggers refresh

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scroller = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const active = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div
      ref={scroller}
      onTouchStart={(e) => {
        if ((scroller.current?.scrollTop ?? 0) <= 0) {
          startY.current = e.touches[0].clientY;
          active.current = true;
        } else {
          active.current = false;
        }
      }}
      onTouchMove={(e) => {
        if (!active.current || refreshing) return;
        const dy = e.touches[0].clientY - startY.current;
        if (dy > 0 && (scroller.current?.scrollTop ?? 0) <= 0) {
          setPull(Math.min(dy * 0.5, 96));
        } else {
          active.current = false;
          setPull(0);
        }
      }}
      onTouchEnd={() => {
        if (!active.current) return;
        active.current = false;
        if (pull >= THRESHOLD) {
          setRefreshing(true);
          setTimeout(() => window.location.reload(), 200);
        } else {
          setPull(0);
        }
      }}
      className="fixed inset-0 z-40 overflow-y-auto bg-[color:var(--color-reel-bg)] text-white [font-family:var(--font-sans)]"
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[50] flex justify-center overflow-hidden"
        style={{ height: pull, opacity: Math.min(pull / THRESHOLD, 1) }}
      >
        <div className="mt-4 grid size-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div
        className="relative mx-auto flex min-h-full max-w-[440px] flex-col"
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: active.current ? "none" : "transform 0.25s ease",
        }}
      >
        {title && (
          <header
            className="sticky top-0 z-20 border-b border-white/5 bg-[color:var(--color-reel-bg)]/85 px-5 backdrop-blur"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex items-center justify-between py-3">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                whoamidating
              </div>
              <div className="[font-family:var(--font-display)] text-lg tracking-wide">{title}</div>
              <div className="w-14" />
            </div>
          </header>
        )}

        {/* Safe-area top padding lives here (inline → not overridden by page py-*). */}
        <main
          className="relative flex-1 pb-28"
          style={{ paddingTop: title ? undefined : "env(safe-area-inset-top)" }}
        >
          {children}
        </main>
      </div>

      {/* Native-style bottom tab bar with a center FAB (log a date) */}
      <nav className="fixed bottom-0 left-1/2 z-[45] w-full max-w-[440px] -translate-x-1/2">
        <div className="relative border-t border-white/10 bg-[color:var(--color-reel-bg)]/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur">
          <div className="grid grid-cols-5 items-end">
            {LEFT_TABS.map((t) => (
              <TabItem key={t.to} tab={t} active={pathname === t.to} />
            ))}
            <div className="flex justify-center">
              <Link
                to="/log"
                aria-label="Log a date"
                className="-mt-6 flex size-14 items-center justify-center rounded-full text-black shadow-[0_10px_30px_-8px_rgba(255,90,120,0.6)] transition-transform active:scale-95"
                style={{ background: "var(--color-reel-rose)" }}
              >
                <span className="text-2xl font-light leading-none">＋</span>
              </Link>
            </div>
            {RIGHT_TABS.map((t) => (
              <TabItem key={t.to} tab={t} active={pathname === t.to} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

// A neutral dark loading screen for app routes — rendered on the server and until
// auth + data resolve, so users never see the logged-out HTML or empty content
// flash before the real page appears.
export function AppLoading() {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      </div>
    </AppShell>
  );
}

function TabItem({
  tab,
  active,
}: {
  tab: { to: string; label: string; icon: string };
  active: boolean;
}) {
  return (
    <Link
      to={tab.to}
      className="flex flex-col items-center gap-1 py-2 transition-colors"
      style={{ color: active ? "var(--color-reel-rose)" : "rgba(255,255,255,0.5)" }}
    >
      <span className="text-lg leading-none">{tab.icon}</span>
      <span className="text-[10px] uppercase tracking-[0.2em]">{tab.label}</span>
    </Link>
  );
}
