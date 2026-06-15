import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthState, isRealUser, signOut } from "@/lib/auth";
import { useStore, saveProfile } from "@/lib/datedata/store";
import { type AgeRange, type Profile } from "@/lib/datedata/types";
import { toast } from "sonner";
import { ArrowLeft, User, Lock, Mail, LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — WhoAmIDating" },
      { name: "description", content: "Manage your account settings." },
    ],
  }),
  component: SettingsPage,
});

const AGE_RANGES: AgeRange[] = ["18-24", "25-34", "35-44", "45+"];
const STAGES = ["Dating", "In a relationship", "Married", "Other"];

function SettingsPage() {
  const { user } = useAuthState();
  const { profile, userId } = useStore();
  const real = isRealUser();

  const [profileDraft, setProfileDraft] = useState<Profile>(
    profile ?? { id: userId, displayName: "", ageRange: "25-34", city: "", country: "", relationshipStage: "Dating" }
  );
  const [profileSaving, setProfileSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileDraft.displayName.trim()) return toast.error("Display name is required.");
    if (profileDraft.displayName.length > 30) return toast.error("Display name max 30 chars.");
    if (!/^[a-zA-Z0-9_]+$/.test(profileDraft.displayName)) return toast.error("Only letters, numbers and _ allowed.");
    setProfileSaving(true);
    try {
      await saveProfile(profileDraft);
      toast.success("Profile saved!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      toast.error(msg.includes("taken") ? "That username is already taken." : msg);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Confirmation sent to your new email — click the link to confirm.");
      setNewEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update email.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) return toast.error("Passwords don't match.");
    if (newPw.length < 6) return toast.error("Password must be at least 6 characters.");
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/profile" className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile section */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Profile</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username</label>
              <input
                value={profileDraft.displayName}
                onChange={(e) => setProfileDraft({ ...profileDraft, displayName: e.target.value })}
                placeholder="your_username"
                className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground mt-1">Letters, numbers, underscore only. Must be unique.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">City</label>
                <input value={profileDraft.city} onChange={(e) => setProfileDraft({ ...profileDraft, city: e.target.value })} placeholder="Berlin" className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</label>
                <input value={profileDraft.country} onChange={(e) => setProfileDraft({ ...profileDraft, country: e.target.value })} placeholder="Germany" className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Age Range</label>
                <select value={profileDraft.ageRange} onChange={(e) => setProfileDraft({ ...profileDraft, ageRange: e.target.value as AgeRange })} className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                  {AGE_RANGES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Relationship Stage</label>
                <select value={profileDraft.relationshipStage} onChange={(e) => setProfileDraft({ ...profileDraft, relationshipStage: e.target.value })} className="mt-1 w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={profileSaving} className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition">
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Account section — only for email/password users */}
        {real && (
          <>
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-primary" />
                <h2 className="font-bold">Email</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Current: <span className="font-medium text-foreground">{user?.email}</span></p>
              <form onSubmit={handleChangeEmail} className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button type="submit" disabled={emailSaving || !newEmail} className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition">
                  {emailSaving ? "Sending…" : "Change Email"}
                </button>
              </form>
            </section>

            {!user?.app_metadata?.provider?.includes("google") && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-4 w-4 text-primary" />
                  <h2 className="font-bold">Password</h2>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <button type="submit" disabled={pwSaving || !newPw || !confirmPw} className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition">
                    {pwSaving ? "Updating…" : "Change Password"}
                  </button>
                </form>
              </section>
            )}
          </>
        )}

        {/* Sign out */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-bold">Account</h2>
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-full border border-destructive text-destructive py-2.5 text-sm font-semibold hover:bg-destructive/10 transition"
          >
            Sign Out
          </button>
        </section>
      </div>
    </main>
  );
}
