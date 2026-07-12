"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { avatarColor } from "@/app/dashboard/feed";

interface SP { id: string; body: string; createdAt: string; likeCount: number; commentCount: number; author: { username: string | null; displayName: string | null; avatarUrl: string | null }; }
interface SU { id: string; username: string | null; displayName: string | null; avatarUrl: string | null; postCount: number; }

function name(a: { username: string | null; displayName: string | null }) {
  return a.displayName || (a.username ? "@" + a.username : "Someone");
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function SearchInner() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [posts, setPosts] = useState<SP[]>([]);
  const [users, setUsers] = useState<SU[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "posts" | "people">("all");

  const run = useCallback(async () => {
    if (!q) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (r.ok) { setPosts(d.posts); setUsers(d.users); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [q]);

  useEffect(() => { run(); }, [run]);

  const shownPosts = tab === "people" ? [] : posts;
  const shownUsers = tab === "posts" ? [] : users;

  return (
    <>
      <div className="tw-header px-4 py-3">
        <div className="text-xl font-bold">Search</div>
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>
          {q ? `Results for "${q}"` : "Find posts, people, #hashtags"}
        </div>
      </div>

      {q && (
        <div className="flex tw-header" style={{ position: "relative" }}>
          <div className={`tw-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>Top</div>
          <div className={`tw-tab ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>Posts</div>
          <div className={`tw-tab ${tab === "people" ? "active" : ""}`} onClick={() => setTab("people")}>People</div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>Searching…</p>
      ) : !q ? (
        <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>
          Try a search — e.g. <b>#fest</b>, <b>@aarav</b>, or <b>canteen</b>
        </div>
      ) : shownPosts.length === 0 && shownUsers.length === 0 ? (
        <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>No results for "{q}".</div>
      ) : (
        <div>
          {shownUsers.map((u) => (
            <a key={u.id} href={u.username ? `/u/@${u.username}` : "#"} className="tw-post p-4 flex gap-3 items-center hover:bg-white/5">
              <div className="tw-avatar" style={{ background: avatarColor(name(u)) }}>{name(u).charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <div className="font-bold text-[15px] truncate">{name(u)}</div>
                <div className="text-[13px]" style={{ color: "var(--muted)" }}>@{u.username} · {u.postCount} posts</div>
              </div>
            </a>
          ))}
          {shownPosts.map((p) => (
            <article key={p.id} className="tw-post p-4 flex gap-3">
              <div className="tw-avatar" style={{ background: avatarColor(name(p.author)) }}>{name(p.author).charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[15px]">
                  {p.author.username ? (
                    <a className="font-bold hover:underline" href={`/u/@${p.author.username}`}>{name(p.author)}</a>
                  ) : <span className="font-bold">{name(p.author)}</span>}
                  <span style={{ color: "var(--muted)" }}>{timeAgo(p.createdAt)}</span>
                </div>
                <p className="text-[15px] whitespace-pre-wrap my-1">{p.body}</p>
                <div className="text-[13px]" style={{ color: "var(--muted)" }}>❤️ {p.likeCount} · 💬 {p.commentCount}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <AppShell active="explore">
      <Suspense fallback={<p className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>Loading…</p>}>
        <SearchInner />
      </Suspense>
    </AppShell>
  );
}
