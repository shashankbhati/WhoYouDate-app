import { Link } from "@tanstack/react-router";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "HOME" },
  { to: "/stats", label: "STATS" },
  { to: "/log", label: "LOG" },
  { to: "/profile", label: "PROFILE" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        </div>
      )}
    </header>
  );
}