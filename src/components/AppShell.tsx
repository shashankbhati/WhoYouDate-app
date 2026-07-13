import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

// Full-screen phone-app frame with a native-style bottom tab bar. Uses the same
// technique as the plan reel: fixed inset-0 over the website chrome, dark reel
// palette, safe-area aware. Tabs point at the real app routes.
const LEFT_TABS = [
  { to: "/", label: "Home", icon: "◐" },
  { to: "/plan", label: "Plans", icon: "◇" },
] as const;
const RIGHT_TABS = [
  { to: "/dates", label: "Dates", icon: "◉" },
  { to: "/profile", label: "You", icon: "☾" },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[color:var(--color-reel-bg)] text-white [font-family:var(--font-sans)]">
      <div className="relative mx-auto flex min-h-full max-w-[440px] flex-col">
        {title && (
          <header className="sticky top-0 z-20 border-b border-white/5 bg-[color:var(--color-reel-bg)]/85 px-5 pt-safe backdrop-blur">
            <div className="flex items-center justify-between py-3">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                whoamidating
              </div>
              <div className="[font-family:var(--font-display)] text-lg tracking-wide">{title}</div>
              <div className="w-14" />
            </div>
          </header>
        )}

        <main className="relative flex-1 pb-28">{children}</main>
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
