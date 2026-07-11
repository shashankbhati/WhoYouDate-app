import { useEffect, useState } from "react";

// A "remind me later" add-to-home-screen banner.
//   • Chrome/Edge (Android + desktop): captures the native install prompt → one-tap install.
//   • iOS/Safari: Apple blocks programmatic install → show the manual Share hint.
//   • Android without a captured prompt: show the menu hint so it's never a dead end.
//
// It hides only when the app is genuinely running installed (standalone). Dismissing
// is a soft "maybe later": it snoozes for the current page view but re-appears on the
// next full refresh — iOS gives websites no way to know it's already installed when
// viewed in Safari, so we keep gently reminding until they open it from the icon.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Capture the install event as early as the module loads — Chrome often fires it
// before React mounts, so listening only inside a component's effect misses it.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("wad:installable"));
  });
}

// Module-level, NOT persisted — so a soft dismiss lasts only for this page load
// (survives in-app navigation, resets on a real browser refresh).
let snoozedThisLoad = false;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [hasPrompt, setHasPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) return; // running installed
    if (snoozedThisLoad) return; // "maybe later" tapped this load

    const ua = navigator.userAgent;
    const o = /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "other";
    setOs(o);
    if (deferredPrompt) setHasPrompt(true);

    const onInstallable = () => {
      if (snoozedThisLoad) return;
      setHasPrompt(true);
      setShow(true);
    };
    window.addEventListener("wad:installable", onInstallable);

    // Show after a moment: if we can prompt (any platform) or on any phone.
    const t = setTimeout(() => {
      if (snoozedThisLoad) return;
      if (deferredPrompt || o === "ios" || o === "android") setShow(true);
    }, 2000);

    return () => {
      clearTimeout(t);
      window.removeEventListener("wad:installable", onInstallable);
    };
  }, []);

  function dismiss() {
    snoozedThisLoad = true; // soft: comes back on the next full refresh
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[60] mx-auto max-w-md rounded-2xl border border-white/10 bg-[color:var(--color-reel-surface,#1a1a1e)] p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-reel-rose,#f43f5e)]/20 text-xl">
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            For the best experience, we recommend adding us to your home screen:
          </p>
          {hasPrompt ? (
            <p className="mt-1 text-xs text-white/70">
              No address bar, smoother swiping — one tap to add it.
            </p>
          ) : os === "ios" ? (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              1. Tap <ShareIcon className="mx-0.5 inline size-3.5 -translate-y-px" /> (Share)
              <br />
              2. Choose <span className="font-semibold text-white">Add to Home Screen</span>
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              1. Open the browser menu <span className="font-semibold text-white">⋮</span>
              <br />
              2. Choose <span className="font-semibold text-white">Install app</span> / Add to Home
              screen
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-3">
            {hasPrompt && (
              <button
                onClick={install}
                className="rounded-full bg-[color:var(--color-reel-rose,#f43f5e)] px-4 py-1.5 text-sm font-semibold text-neutral-950"
              >
                Add to home screen
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-xs font-medium text-white/50 hover:text-white"
            >
              Maybe later
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3v13M12 3l-4 4M12 3l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
