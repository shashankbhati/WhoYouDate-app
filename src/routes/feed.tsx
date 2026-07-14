import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, AppLoading } from "@/components/AppShell";
import { useStore, addPost } from "@/lib/datedata/store";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { detectPII } from "@/lib/datedata/pii";
import type { Post } from "@/lib/datedata/types";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Community feed | WhoAmIDating" },
      {
        name: "description",
        content: "Anonymous dating stories, confessions, and advice from the community.",
      },
    ],
  }),
  component: FeedPage,
});

const TYPES: Post["type"][] = ["story", "advice", "question", "observation"];

function FeedPage() {
  const { posts, profile, profileChecked } = useStore();
  const { isReal } = useAuthState();
  const [text, setText] = useState("");
  const [type, setType] = useState<Post["type"]>("story");
  const [busy, setBusy] = useState(false);

  async function post() {
    const t = text.trim();
    if (!t) return;
    if (!isReal) return openAuthModal("Sign in to post to the feed.");
    const pii = detectPII(t);
    if (pii) {
      toast.error(`Please remove personal info (${pii}) — keep it anonymous.`);
      return;
    }
    setBusy(true);
    await addPost({
      id: `tmp-${Date.now()}`,
      author: profile?.displayName ?? "anon",
      type,
      content: t,
      tags: [],
      upvotes: 1,
      downvotes: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    });
    setBusy(false);
    setText("");
    toast.success("Posted 🎉");
  }

  if (!profileChecked) return <AppLoading />;

  return (
    <AppShell>
      <div className="px-5 py-6 text-white">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/45">
          Community
        </p>
        <h1 className="[font-family:var(--font-display)] mt-1 text-3xl tracking-wide">The feed</h1>
        <p className="mt-1 text-sm text-white/55">
          Anonymous stories, confessions, and advice. No names, no numbers.
        </p>

        {/* Composer */}
        <div className="mt-5 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-4">
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => setType(tp)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                  type === tp
                    ? "bg-white text-neutral-950"
                    : "border border-white/15 bg-white/[0.04] text-white/70"
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="Share a dating story or confession… (stays anonymous)"
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/35">{text.length}/500</span>
            <button
              onClick={post}
              disabled={busy || !text.trim()}
              className="rounded-full bg-[color:var(--color-reel-rose)] px-5 py-2 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : "Post"}
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="mt-6 space-y-3">
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">
              Nothing yet — be the first to share.
            </p>
          ) : (
            posts.slice(0, 40).map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
                    {p.type}
                  </span>
                  <span className="text-xs text-white/45">
                    u/{p.author} · {relTime(p.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/90">{p.content}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                  <span>▲ {p.upvotes}</span>
                  <span>💬 {p.comments.length}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

function relTime(iso: string): string {
  const h = Math.floor((Date.now() - +new Date(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
