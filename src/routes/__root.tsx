import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Analytics } from "@vercel/analytics/react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/datedata/Header";
import { Toaster } from "../components/ui/sonner";
import { AuthModal } from "../components/auth/AuthModal";
import { UsernameSetup } from "../components/auth/UsernameSetup";
import { useAuthState } from "../lib/auth";
import { useStore } from "../lib/datedata/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "whoami — Anonymous Dating Ledger" },
      { name: "description", content: "An anonymous ledger of modern dating. No real names. No phone numbers. No apps tracking you back." },
      { name: "author", content: "whoami" },
      { property: "og:title", content: "whoami — Anonymous Dating Ledger" },
      { property: "og:description", content: "An anonymous ledger of modern dating. No real names. No phone numbers. No apps tracking you back." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@whoamidating" },
      { name: "twitter:title", content: "whoami — Anonymous Dating Ledger" },
      { name: "twitter:description", content: "An anonymous ledger of modern dating. No real names. No phone numbers. No apps tracking you back." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b36138f3-1977-4255-a689-253906a7d5ef/id-preview-bc380d38--cb4d77ac-7f23-46df-84df-d3a2282e1fec.lovable.app-1780072729691.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b36138f3-1977-4255-a689-253906a7d5ef/id-preview-bc380d38--cb4d77ac-7f23-46df-84df-d3a2282e1fec.lovable.app-1780072729691.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-bold text-foreground">WhoAmIDating</span>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            An anonymous ledger of modern dating. No names. No numbers. No apps tracking you back.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-bold tracking-widest text-muted-foreground mb-4">THE PROJECT</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="text-foreground hover:text-primary transition">About</Link></li>
            <li><Link to="/privacy" className="text-foreground hover:text-primary transition">How anonymity works</Link></li>
            <li><Link to="/privacy" className="text-foreground hover:text-primary transition">Privacy &amp; data</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold tracking-widest text-muted-foreground mb-4">COMMUNITY</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-foreground hover:text-primary transition">Feed</Link></li>
            <li><Link to="/stats" className="text-foreground hover:text-primary transition">Your ledger</Link></li>
            <li><Link to="/log" className="text-foreground hover:text-primary transition">Log an entry</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold tracking-widest text-muted-foreground mb-4">METHODOLOGY</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every stat on this site is derived from the open community ledger. Numbers below ~25 entries are marked <em>thin sample</em>. Personally identifying inputs are scrubbed at entry time.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground text-center">
          © 2026 whoami · est. a quiet corner of the internet
        </p>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { isReal, modal } = useAuthState();
  const { profile, loading: storeLoading } = useStore();
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);

  // Show username setup once after email is confirmed and no profile exists yet
  useEffect(() => {
    if (isReal && !storeLoading && !profile) {
      setShowUsernameSetup(true);
    }
    if (profile) {
      setShowUsernameSetup(false);
    }
  }, [isReal, storeLoading, profile]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <Outlet />
        <Footer />
        <Toaster />
        <AuthModal open={modal.open} message={modal.message} />
        <UsernameSetup open={showUsernameSetup} onDone={() => setShowUsernameSetup(false)} />
        <Analytics />
      </div>
    </QueryClientProvider>
  );
}
