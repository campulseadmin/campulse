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
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/posts?sort=${sort}`);
      const d = await r.json();
      if (r.ok) setPosts(d.posts);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [sort]);

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
      if (sort === "top") setSort("latest");
      load();
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
      </div>
    </article>
  );
}
