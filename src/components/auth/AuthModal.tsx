import { useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { signInWithGoogle, signUpWithEmail, signInWithEmailPassword, closeAuthModal } from "@/lib/auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  message: string;
}

export function AuthModal({ open, message }: Props) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!open) return null;

  function close() {
    setEmail("");
    setPassword("");
    setTab("signin");
    closeAuthModal();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Page will redirect to Google, no need to close modal
    } catch {
      toast.error("Couldn't connect to Google. Try again.");
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    try {
      if (tab === "signup") {
        await signUpWithEmail(email, password);
        toast.success("Account created! Check your email to confirm, then sign in.");
        setTab("signin");
      } else {
        await signInWithEmailPassword(email, password);
        close();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("Invalid login")) toast.error("Wrong email or password.");
      else if (msg.includes("already registered")) toast.error("Account exists. Sign in instead.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button onClick={close} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition">
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-bold text-xl mb-1">
          {tab === "signin" ? "Welcome back" : "Join WhoAmIDating"}
        </h2>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 rounded-full border border-border bg-background hover:bg-muted py-2.5 text-sm font-semibold transition disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1 mb-4">
          <button
            onClick={() => setTab("signin")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${tab === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${tab === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            autoFocus
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {tab === "signup" ? "Creating account..." : "Signing in..."}</>
            ) : (
              tab === "signup" ? "Create Account" : "Sign In"
            )}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By continuing you agree to our{" "}
          <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
          Anonymous by design.
        </p>
      </div>
    </div>
  );
}
