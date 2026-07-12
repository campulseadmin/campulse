"use client";
import { useState, useEffect, useCallback } from "react";

interface Author { username: string | null; displayName: string | null; avatarUrl: string | null; }
interface Comment { id: string; body: string; createdAt: string; author: Author; }
interface Post {
  id: string; body: string; imageUrl: string | null; createdAt: string;
  author: Author; community: { name: string; slug: string } | null;
  likeCount: number; commentCount: number; likedByMe: boolean;
}

function name(a: Author) { return a.displayName || (a.username ? "@" + a.username : "Someone"); }

const AVATAR_COLORS = ["#1d9bf0", "#f91880", "#00ba7c", "#ffd400", "#7856ff", "#ff7a00"];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<"latest" | "top">("latest");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const r = await fetch(`/api/posts?sort=${sort}`);
      const d = await r.json();
      if (r.ok) { setPosts(d.posts); setNextCursor(d.nextCursor ?? null); setHasMore(!!d.nextCursor); }
    } catch { /* ignore */ }
    finally { if (reset) setLoading(false); }
  }, [sort]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor || !hasMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/posts?sort=${sort}&cursor=${encodeURIComponent(nextCursor)}`);
      const d = await r.json();
      if (r.ok) {
        setPosts((ps) => [...ps, ...d.posts]);
        setNextCursor(d.nextCursor ?? null);
        setHasMore(!!d.nextCursor);
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, nextCursor, hasMore, sort]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setPosting(true); setErr("");
    try {
      const r = await fetch("/api/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not post."); return; }
      setBody("");
      // Prepend the new post locally instead of reloading the whole feed.
      if (sort === "top") { setSort("latest"); }
      else {
        const meR = await fetch("/api/sidebar").then((x) => x.json()).catch(() => null);
        const me = meR?.me;
        const np: Post = {
          id: d.id, body: text, imageUrl: null,
          createdAt: new Date().toISOString(),
          author: { username: me?.username ?? null, displayName: me?.displayName ?? "You", avatarUrl: null },
          community: null, likeCount: 0, commentCount: 0, likedByMe: false,
        };
        setPosts((ps) => [np, ...ps]);
      }
    } catch { setErr("Network error."); }
    finally { setPosting(false); }
  }

  async function toggleLike(id: string) {
    setPosts((ps) => ps.map((p) => p.id === id
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
      : p));
    try {
      const r = await fetch(`/api/posts/${id}/like`, { method: "POST" });
      const d = await r.json();
      if (r.ok) setPosts((ps) => ps.map((p) => p.id === id
        ? { ...p, likedByMe: d.liked, likeCount: d.likeCount } : p));
    } catch { load(); }
  }

  return (
    <section>
      {/* compose box */}
      <div className="tw-compose p-4 flex gap-3">
        <div className="tw-avatar" style={{ background: "var(--accent)" }}>{(name({ username: null, displayName: "You", avatarUrl: null })).charAt(0)}</div>
        <div className="flex-1">
          <textarea
            className="input" style={{ borderRadius: 14 }} rows={2} maxLength={2000}
            placeholder="What's happening?"
            value={body} onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--muted)" }}>{body.length}/2000</span>
            <button className="btn" disabled={posting || !body.trim()}>
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
          {err && <p className="text-sm mt-2" style={{ color: "var(--like)" }}>{err}</p>}
        </div>
      </div>

      {/* sort tabs */}
      <div className="flex tw-header" style={{ position: "relative" }}>
        <div className={`tw-tab ${sort === "latest" ? "active" : ""}`} onClick={() => setSort("latest")}>Latest</div>
        <div className={`tw-tab ${sort === "top" ? "active" : ""}`} onClick={() => setSort("top")}>Top</div>
      </div>

      {loading ? (
        <p className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>
          No posts yet. Be the first to post!
        </div>
      ) : (
        <div>
          {posts.map((p) => <PostCard key={p.id} post={p} onLike={toggleLike} />)}
          {hasMore && (
            <div ref={(el) => {
              if (!el) return;
              const io = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) loadMore();
              }, { rootMargin: "300px" });
              io.observe(el);
              return () => io.disconnect();
            }} className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>
              {loadingMore ? "Loading more…" : "Scroll for more"}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>You're all caught up ✦</div>
          )}
        </div>
      )}
    </section>
  );
}

export function PostCard({ post, onLike, staticView }: { post: Post; onLike: (id: string) => void; staticView?: boolean }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cbody, setCbody] = useState("");
  const [cloading, setCloading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const n = name(post.author);

  async function openComments() {
    if (!open) {
      setCloading(true);
      try {
        const r = await fetch(`/api/posts/${post.id}/comments`);
        const d = await r.json();
        if (r.ok) setComments(d.comments);
      } catch { /* ignore */ }
      finally { setCloading(false); }
    }
    setOpen((o) => !o);
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const text = cbody.trim();
    if (!text) return;
    try {
      const r = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await r.json();
      if (r.ok) { setComments((cs) => [...cs, d.comment]); setCbody(""); post.commentCount++; }
    } catch { /* ignore */ }
  }

  return (
    <article className="tw-post p-4 flex gap-3">
      <div className="tw-avatar" style={{ background: avatarColor(n) }}>{n.charAt(0).toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[15px]">
          {post.author.username ? (
            <a className="font-bold hover:underline" href={`/u/@${post.author.username}`}>{n}</a>
          ) : (
            <span className="font-bold">{n}</span>
          )}
          <span style={{ color: "var(--muted)" }}>
            {post.author.username ? <>@{post.author.username} · </> : null}{timeAgo(post.createdAt)}
          </span>
          {post.community ? (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>{post.community.name}</span>
          ) : null}
        </div>

        <p className="text-[15px] whitespace-pre-wrap my-1">{post.body}</p>

        <div className="flex items-center justify-between mt-2" style={{ maxWidth: 420, color: "var(--muted)" }}>
          <button onClick={() => !staticView && openComments()} className="tw-ico" title="Comment">💬 {post.commentCount}</button>
          <button onClick={() => !staticView && onLike(post.id)} className="tw-ico" title="Like"
            style={{ color: post.likedByMe ? "var(--like)" : "var(--muted)" }}>
            {post.likedByMe ? "♥" : "♡"} {post.likeCount}
          </button>
          {!staticView && (
            <button onClick={() => { setReportSent(false); setReporting(true); }} className="tw-ico" title="Report" style={{ position: "relative" }}>
              ⚑ Report
              {reportSent && (
                <span className="text-[11px] ml-1" style={{ color: "var(--accent)" }}>✓ sent</span>
              )}
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            {cloading ? (
              <p className="text-xs" style={{ color: "var(--muted)" }}>Loading…</p>
            ) : (
              <div className="space-y-2 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="text-[14px]">
                    <span className="font-semibold">{name(c.author)}</span>{" "}
                    <span style={{ color: "var(--muted)" }} className="text-xs">{timeAgo(c.createdAt)}</span>
                    <div>{c.body}</div>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>No comments yet.</p>}
              </div>
            )}
            <form onSubmit={addComment} className="flex gap-2">
              <input className="input" placeholder="Post your reply" value={cbody}
                onChange={(e) => setCbody(e.target.value)} maxLength={1000} />
              <button className="btn" disabled={!cbody.trim()}>Reply</button>
            </form>
          </div>
        )}

        {reporting && (
          <ReportModal
            postId={post.id}
            onClose={() => setReporting(false)}
            onSent={() => { setReportSent(true); setReporting(false); }}
          />
        )}
      </div>
    </article>
  );
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "misinformation", label: "Misinformation" },
  { value: "nsfw", label: "NSFW / inappropriate" },
  { value: "other", label: "Other" },
];

function ReportModal({ postId, onClose, onSent }: { postId: string; onClose: () => void; onSent: () => void }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      if (r.ok) onSent();
      else alert("Could not submit report.");
    } catch {
      alert("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-5 rounded-2xl"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="font-bold text-[17px] mb-1">Report post</div>
        <div className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>
          Your report is anonymous to the author and reviewed by campus moderators.
        </div>

        <div className="space-y-2 mb-4">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 cursor-pointer text-[14px]">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          className="input w-full"
          style={{ borderRadius: 12, minHeight: 64 }}
          placeholder="Add details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn-ghost" style={{ borderRadius: 9999, padding: "8px 16px", fontWeight: 700 }} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" style={{ borderRadius: 9999, padding: "8px 16px", fontWeight: 700 }} disabled={busy}>
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}
