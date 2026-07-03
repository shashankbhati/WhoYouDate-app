import { useState } from "react";
import { Loader2 } from "lucide-react";
import { saveProfile } from "@/lib/datedata/store";
import { getAuthUser } from "@/lib/auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onDone: () => void;
}

export function UsernameSetup({ open, onDone }: Props) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 2) return toast.error("At least 2 characters.");
    if (name.length > 20) return toast.error("Max 20 characters.");
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return toast.error("Letters, numbers, and underscores only.");

    setLoading(true);
    try {
      const user = getAuthUser();
      await saveProfile({
        id: user?.id ?? "",
        displayName: name,
        firstName: firstName.trim() || undefined,
        ageRange: "25-34",
        city: "Berlin",
        country: "Germany",
        relationshipStage: "Dating",
      });
      toast.success(`Welcome, u/${name}!`);
      onDone();
    } catch {
      toast.error("Couldn't save username. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="font-bold text-xl">Pick your username</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          This is how you appear in posts and comments — public but completely anonymous.
        </p>
        <form onSubmit={save} className="space-y-3 text-left">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
              u/
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="yourname"
              maxLength={20}
              autoFocus
              className="w-full rounded-xl bg-input border border-border pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <label className="text-xs font-semibold block mb-1">Your first name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value.slice(0, 20))}
              placeholder="e.g. Sara"
              className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              🔒 Hidden — never shown publicly. Only used to power anonymous "how much do people named Sara spend" stats. First name only.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || username.trim().length < 2}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              "Set Username"
            )}
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          Letters, numbers, underscores. Max 20 chars.
        </p>
      </div>
    </div>
  );
}
