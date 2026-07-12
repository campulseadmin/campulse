"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { PostCard } from "@/app/dashboard/feed";
import { Avatar } from "@/components/Avatar";
import { AppShell } from "@/components/AppShell";

interface Author { username: string | null; displayName: string | null; avatarUrl: string | null; }
interface Post {
  id: string; body: string; imageUrl: string | null; createdAt: string;
  author: Author; community: { name: string; slug: string } | null;
  likeCount: number; commentCount: number; likedByMe: boolean;
}

function ProfileInner({ handle }: { handle: string }) {
  const router = useRouter();
  const [user, setUser] = useState<{
    username: string; displayName: string | null; bio: string | null;
    dept: string | null; batch: string | null; campusShort: string;
    createdAt: string; postCount: number; avatarUrl: string | null;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "media" | "likes">("posts");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isMe, setIsMe] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setLoading(true); setErr("");
    fetch(`/api/profile?u=${encodeURIComponent(handle)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setErr(d.error || "Not found."); return; }
        setUser(d.user); setPosts(d.posts);
      })
      .catch(() => setErr("Network error."))
      .finally(() => setLoading(false));
  }, [handle]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/sidebar").then((r) => r.json()).then((d) => {
      if (d.me) setIsMe(d.me.username === user.username);
    }).catch(() => {});
  }, [user?.username]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/avatar", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok && d.avatarUrl) {
        setUser((u) => (u ? { ...u, avatarUrl: d.avatarUrl } : u));
      }
    } catch { /* ignore */ }
    finally { setPhotoBusy(false); }
  }

  if (loading) return <p className="text-center text-sm p-8" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (err || !user) return <p className="text-center text-sm p-8" style={{ color: "var(--muted)" }}>{err || "User not found."}</p>;

  const joined = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <div style={{ height: 200, background: "linear-gradient(120deg, var(--accent), #7856ff)" }} />
      <div className="max-w-[600px] mx-auto px-4" style={{ marginTop: -64 }}>
        <div className="flex items-end justify-between">
          <label style={{ cursor: isMe ? "pointer" : "default", position: "relative", display: "inline-block" }}>
            <Avatar src={user.avatarUrl} name={user.displayName || user.username} size={128} ring />
            {isMe && (
              <>
                <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-full text-white text-xs font-semibold"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  {photoBusy ? "Uploading…" : "Change"}
                </span>
              </>
            )}
          </label>
          <button className="btn w-24 mt-4" style={{ borderRadius: 9999 }} onClick={() => router.push("/dashboard")}>
            Done
          </button>
        </div>

        <div className="mt-3">
          <div className="text-xl font-bold leading-tight">{user.displayName || user.username}</div>
          <div className="text-[15px]" style={{ color: "var(--muted)" }}>@{user.username}</div>
        </div>

        {user.bio && <p className="mt-3 text-[15px] whitespace-pre-wrap">{user.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]" style={{ color: "var(--muted)" }}>
          {user.dept && <span>🏫 {user.dept}</span>}
          {user.batch && <span>🎓 {user.batch}</span>}
          <span>📅 Joined {joined}</span>
        </div>

        <div className="mt-2 flex gap-4 text-[15px]" style={{ color: "var(--muted)" }}>
          <span><b style={{ color: "var(--fg)" }}>{user.postCount}</b> Posts</span>
        </div>

        <div className="flex tw-header mt-4" style={{ position: "relative" }}>
          <div className={`tw-tab ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>Posts</div>
          <div className={`tw-tab ${tab === "media" ? "active" : ""}`} onClick={() => setTab("media")}>Media</div>
          <div className={`tw-tab ${tab === "likes" ? "active" : ""}`} onClick={() => setTab("likes")}>Likes</div>
        </div>

        <div className="pb-16">
          {tab !== "posts" ? (
            <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>
              {tab === "media" ? "No media yet." : "No likes yet."}
            </div>
          ) : posts.length === 0 ? (
            <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>
              @{user.username} hasn't posted yet.
            </div>
          ) : (
            posts.map((p) => (
              <PostCard key={p.id} post={p} onLike={async () => {}} staticView />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage({ params }: { params: { handle: string } }) {
  const handle = decodeURIComponent(params.handle).toLowerCase().replace(/^@/, "");
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><div className="card p-8" style={{ color: "var(--muted)" }}>Loading…</div></main>}>
      <AppShell active="profile">
        <ProfileInner handle={handle} />
      </AppShell>
    </Suspense>
  );
}
