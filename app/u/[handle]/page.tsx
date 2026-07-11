"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { PostCard, avatarColor } from "@/app/dashboard/feed";
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
    createdAt: string; postCount: number;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "media" | "likes">("posts");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  if (loading) return <p className="text-center text-sm p-8" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (err || !user) return <p className="text-center text-sm p-8" style={{ color: "var(--muted)" }}>{err || "User not found."}</p>;

  const initial = (user.displayName || user.username || "U").charAt(0).toUpperCase();
  const col = avatarColor(user.username);
  const joined = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <div style={{ height: 200, background: "linear-gradient(120deg, var(--accent), #7856ff)" }} />
      <div className="max-w-[600px] mx-auto px-4" style={{ marginTop: -64 }}>
        <div className="flex items-end justify-between">
          <div
            className="rounded-full flex items-center justify-center font-bold text-white text-4xl"
            style={{ width: 128, height: 128, background: col, border: "4px solid var(--bg)" }}
          >
            {initial}
          </div>
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
