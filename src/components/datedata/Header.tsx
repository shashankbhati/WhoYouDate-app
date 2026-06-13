import { Link } from "@tanstack/react-router";
import { Search, Menu, X, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuthState, openAuthModal, signOut } from "@/lib/auth";
import { useStore } from "@/lib/datedata/store";

const nav = [
  { to: "/", label: "HOME" },
  { to: "/stats", label: "STATS" },
  { to: "/log", label: "LOG" },
  { to: "/profile", label: "PROFILE" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isReal } = useAuthState();
  const { profile } = useStore();

  function handleSignIn() {
    openAuthModal("Save your data across devices and join the community.");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-sm">D</span>
          <span className="font-bold tracking-tight text-foreground hidden sm:block">WhoAmIDating</span>
        </Link>

        <div className="relative flex-1 max-w-md mx-auto hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full rounded-full bg-input/70 border border-border pl-10 pr-4 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" placeholder="Search communities..." />
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

        {/* Mobile: Log CTA + hamburger */}
        <div className="flex items-center gap-2 ml-auto md:hidden">
          <Link to="/log" className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 hover:opacity-90 transition">
            + Log
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
