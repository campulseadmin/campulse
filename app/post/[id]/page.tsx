"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { AppShell } from "@/components/AppShell";

interface Author { username: string | null; displayName: string | null; avatarUrl: string | null; }
interface Comment {
  id: string; body: string; createdAt: string; parentId: string | null;
  author: Author; likeCount: number; replyCount: number; likedByMe: boolean;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function name(a: Author) { return a.displayName || (a.username ? "@" + a.username : "Someone"); }

export default function PostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<{
    id: string; body: string; imageUrl: string | null; createdAt: string; editedAt: string | null;
    author: Author; community: { name: string } | null; likeCount: number; commentCount: number;
    likedByMe: boolean; bookmarkedByMe: boolean; isMine: boolean;
  } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cbody, setCbody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setLoading(true); setErr("");
    fetch(`/api/posts/${params.id}`).then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setErr(d.error || "Not found."); return; }
        setPost(d.post); setComments(d.comments); setBookmarked(d.post.bookmarkedByMe);
      })
      .catch(() => setErr("Network error."))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function likePost() {
    if (!post) return;
    const next = !post.likedByMe;
    setPost({ ...post, likedByMe: next, likeCount: post.likeCount + (next ? 1 : -1) });
    await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
  }
  async function toggleBookmark() {
    setBookmarked((b) => !b);
    fetch(`/api/posts/${params.id}/bookmark`, { method: "POST" });
  }
  async function addComment(parentId: string | null) {
    const text = cbody.trim();
    if (!text) return;
    const r = await fetch(`/api/posts/${params.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId }),
    });
    const d = await r.json();
    if (r.ok) { setComments((cs) => [...cs, d.comment]); setCbody(""); setReplyTo(null);
      if (post) setPost({ ...post, commentCount: post.commentCount + 1 }); }
  }
  async function likeComment(c: Comment) {
    const next = !c.likedByMe;
    setComments((cs) => cs.map((x) => x.id === c.id ? { ...x, likedByMe: next, likeCount: x.likeCount + (next ? 1 : -1) } : x));
    const r = await fetch(`/api/comments/${c.id}/like`, { method: "POST" });
    const d = await r.json();
    if (r.ok) setComments((cs) => cs.map((x) => x.id === c.id ? { ...x, likeCount: d.likeCount, likedByMe: d.liked } : x));
  }

  if (loading) return <AppShell active="home"><p className="p-8 text-center" style={{ color: "var(--muted)" }}>Loading…</p></AppShell>;
  if (err || !post) return <AppShell active="home"><p className="p-8 text-center" style={{ color: "var(--muted)" }}>{err || "Post not found."}</p></AppShell>;

  const n = name(post.author);
  const top = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <AppShell active="home">
      <button className="btn-ghost m-3" style={{ borderRadius: 9999 }} onClick={() => router.back()}>← Back</button>
      <article className="tw-post p-4 flex gap-3">
        <Avatar src={post.author.avatarUrl} name={n} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[15px]">
            {post.author.username ? <a className="font-bold hover:underline" href={`/u/@${post.author.username}`}>{n}</a> : <span className="font-bold">{n}</span>}
            <span style={{ color: "var(--muted)" }}>{post.author.username ? `@${post.author.username} · ` : ""}{timeAgo(post.createdAt)}{post.editedAt ? " · ✎" : ""}</span>
          </div>
          <p className="text-[16px] whitespace-pre-wrap my-2">{post.body}</p>
          <div className="flex items-center gap-6 mt-2" style={{ color: "var(--muted)" }}>
            <button onClick={likePost} className="tw-ico" style={{ color: post.likedByMe ? "var(--like)" : "var(--muted)" }}>{post.likedByMe ? "♥" : "♡"} {post.likeCount}</button>
            <button onClick={toggleBookmark} className="tw-ico" style={{ color: bookmarked ? "var(--accent)" : "var(--muted)" }}>{bookmarked ? "🔖 Saved" : "📑 Save"}</button>
          </div>
        </div>
      </article>

      <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
        <input className="input w-full" placeholder="Post your reply" value={cbody}
          onChange={(e) => setCbody(e.target.value)} maxLength={1000} onKeyDown={(e) => { if (e.key === "Enter" && !replyTo) addComment(null); }} />
        <button className="btn mt-2" disabled={!cbody.trim()} onClick={() => addComment(null)}>Reply</button>
      </div>

      <div className="pb-16">
        {top.map((c) => (
          <div key={c.id} className="tw-post p-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Avatar src={c.author.avatarUrl} name={name(c.author)} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[14px]">
                <span className="font-bold">{name(c.author)}</span>
                <span style={{ color: "var(--muted)" }} className="text-xs">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-[14px] whitespace-pre-wrap my-1">{c.body}</p>
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
                <button onClick={() => likeComment(c)} style={{ color: c.likedByMe ? "var(--like)" : "var(--muted)" }}>{c.likedByMe ? "♥" : "♡"} {c.likeCount}</button>
                <button onClick={() => { setReplyTo(c.id); }}>Reply</button>
              </div>
              {replyTo === c.id && (
                <div className="mt-2">
                  <input className="input w-full" placeholder={`Reply to ${name(c.author)}`} value={cbody}
                    onChange={(e) => setCbody(e.target.value)} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") addComment(c.id); }} />
                  <button className="btn mt-2" disabled={!cbody.trim()} onClick={() => addComment(c.id)}>Reply</button>
                </div>
              )}
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="tw-post p-3 flex gap-2 mt-2" style={{ background: "var(--bg)", borderRadius: 12 }}>
                  <Avatar src={r.author.avatarUrl} name={name(r.author)} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[13px]">
                      <span className="font-bold">{name(r.author)}</span>
                      <span style={{ color: "var(--muted)" }} className="text-xs">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-[13px] whitespace-pre-wrap my-1">{r.body}</p>
                    <button className="text-xs" onClick={() => likeComment(r)} style={{ color: r.likedByMe ? "var(--like)" : "var(--muted)" }}>{r.likedByMe ? "♥" : "♡"} {r.likeCount}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="p-8 text-center" style={{ color: "var(--muted)" }}>No comments yet.</p>}
      </div>
    </AppShell>
  );
}
