import { Link } from "@tanstack/react-router";
import { Search, Menu, X, LogIn, LogOut, Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthState, openAuthModal, signOut } from "@/lib/auth";
import { useStore, getUserId } from "@/lib/datedata/store";
import { useCountry } from "@/lib/country";
import { buildNotifications, type Notif } from "@/lib/datedata/notifications";

const NOTIF_TS_KEY = "wad_notif_ts";

function getLastSeen(): number {
  if (typeof window === "undefined") return Date.now();
  const v = localStorage.getItem(NOTIF_TS_KEY);
  if (v) return parseInt(v);
  const now = Date.now();
  localStorage.setItem(NOTIF_TS_KEY, now.toString());
  return now;
}

function markSeen() {
  if (typeof window !== "undefined") localStorage.setItem(NOTIF_TS_KEY, Date.now().toString());
}

const nav = [
  { to: "/", label: "Feed" },
  { to: "/stats", label: "Your ledger" },
  { to: "/log", label: "Log entry" },
  { to: "/profile", label: "Profile" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isReal } = useAuthState();
  const { profile, posts, entries } = useStore();
  const { config } = useCountry();

  const myId = typeof window !== "undefined" ? getUserId() : "";
  const [lastSeen, setLastSeen] = useState(() => getLastSeen());

  const notifs = useMemo(
    () => buildNotifications(entries, posts, myId, config.currencySymbol),
    [entries, posts, myId, config.currencySymbol]
  );
  const unreadCount = notifs.filter((n) => n.countsUnread && n.ts > lastSeen).length;

  function openNotifs() {
    markSeen();
    setLastSeen(Date.now());
  }

  function handleSignIn() {
    openAuthModal("Save your data across devices and join the community.");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="font-bold tracking-tight text-foreground">whoamidating.singles</span>
        </Link>

        <div className="relative flex-1 max-w-md mx-auto hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full rounded-full bg-input/70 border border-border pl-10 pr-4 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" placeholder="Search the ledger..." />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}>
              {({ isActive }) => (
                <span className={`px-3 py-1.5 text-xs font-bold tracking-wider rounded-md transition ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {n.label}
                </span>
              )}
            </Link>
          ))}

          {/* Notification bell */}
          {myId && <NotifBell notifs={notifs} unreadCount={unreadCount} onOpen={openNotifs} />}

          {isReal ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <span className="text-xs font-semibold text-foreground">
                u/{profile?.displayName ?? "..."}
              </span>
              <button
                onClick={signOut}
                title="Sign out"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="ml-2 flex items-center gap-1.5 rounded-full border border-primary text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/10 transition"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
          )}
        </nav>

        {/* Mobile: bell + Log CTA + hamburger */}
        <div className="flex items-center gap-1.5 ml-auto md:hidden">
          {myId && <NotifBell notifs={notifs} unreadCount={unreadCount} onOpen={openNotifs} />}
          <Link to="/log" className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 hover:opacity-90 transition">
            + Log entry
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} onClick={() => setMobileOpen(false)}>
              {({ isActive }) => (
                <span className={`block px-3 py-2.5 text-sm font-semibold rounded-lg transition ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  {n.label}
                </span>
              )}
            </Link>
          ))}
          <div className="mt-2 pt-2 border-t border-border">
            {isReal ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">u/{profile?.displayName ?? "..."}</span>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { handleSignIn(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2.5 text-sm font-semibold"
              >
                <LogIn className="h-4 w-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// Reusable notification bell + dropdown (used in both desktop nav and mobile bar)
function NotifBell({ notifs, unreadCount, onOpen }: { notifs: Notif[]; unreadCount: number; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) onOpen(); }}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground transition"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold">Notifications</span>
            {unreadCount > 0 && <span className="text-xs text-primary font-semibold">{unreadCount} new</span>}
          </div>
          {notifs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nothing yet — log a date to get things going.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifs.map((n) => (
                <li key={n.id} className="px-4 py-3 hover:bg-muted transition flex items-start gap-2.5" onClick={() => setOpen(false)}>
                  <span className="text-base leading-none shrink-0 mt-0.5">{n.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    {n.sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.sub}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
