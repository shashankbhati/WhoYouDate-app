import { useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { requestEmailLink, closeAuthModal } from "@/lib/auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  message: string;
}

export function AuthModal({ open, message }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await requestEmailLink(email.trim());
      setSent(true);
    } catch {
      toast.error("Couldn't send link. Check your email and try again.");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setSent(false);
    setEmail("");
    closeAuthModal();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button onClick={close} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition">
          <X className="h-5 w-5" />
        </button>

        {!sent ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/20 grid place-items-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Sign in to continue</h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  "Send Magic Link"
                )}
              </button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              No password needed. Your existing data is always preserved.
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-bold text-lg">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Magic link sent to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              Click it to sign in — expires in 1 hour.
            </p>
            <button
              onClick={close}
              className="mt-5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
