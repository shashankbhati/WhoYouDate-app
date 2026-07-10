import { useEffect, useState } from "react";

// A dismissible "add to home screen" banner shown on mobile.
//   • Android/Chromium: captures the native install prompt → one-tap install.
//   • iOS/Safari: Apple blocks programmatic install, so we show the manual hint.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "wad_pwa_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) return; // already installed
    if (localStorage.getItem(DISMISS_KEY)) return; // user said no before

    const ua = navigator.userAgent;
    const isMobile = /android|iphone|ipad|ipod/i.test(ua);
    if (!isMobile) return;

    if (/iphone|ipad|ipod/i.test(ua)) {
      setIos(true);
      const t = setTimeout(() => setShow(true), 2500); // let the page settle first
      return () => clearTimeout(t);
    }

    // Android / Chromium — capture the install prompt and surface our button.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-white/10 bg-[color:var(--color-reel-surface,#1a1a1e)] p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-reel-rose,#f43f5e)]/20 text-xl">
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add to your home screen</p>
          {ios ? (
            <p className="mt-0.5 text-xs text-white/70">
              For the full app experience: tap{" "}
              <ShareIcon className="mx-0.5 inline size-3.5 -translate-y-px" /> then{" "}
              <span className="font-semibold text-white">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-white/70">
              Open it like a real app — full-screen, one tap away.
            </p>
          )}
          {!ios && (
            <button
              onClick={install}
              className="mt-2.5 rounded-full bg-[color:var(--color-reel-rose,#f43f5e)] px-4 py-1.5 text-sm font-semibold text-neutral-950"
            >
              Add to home screen
            </button>
          )}
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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M12 3v13M12 3l-4 4M12 3l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
