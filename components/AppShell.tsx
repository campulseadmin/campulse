"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/app/dashboard/signout";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar } from "@/components/Avatar";

interface Me { username: string | null; displayName: string; initial: string; role?: string; avatarUrl?: string | null; }
interface Comm { id: string; name: string; description: string | null; }
interface Hot { posts: { id: string; body: string; likeCount: number; author: { username: string | null; displayName: string | null } }[]; events: { id: string; title: string; rsvpCount: number }[]; }

export function AppShell({ children, active }: { children: React.ReactNode; active?: "home" | "profile" | "explore" }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [campus, setCampus] = useState<{ shortName: string }>({ shortName: "" });
  const [communities, setCommunities] = useState<Comm[]>([]);
  const [hot, setHot] = useState<Hot>({ posts: [], events: [] });
  const [suggest, setSuggest] = useState<{ id: string; username: string | null; displayName: string | null; avatarUrl: string | null | undefined; _count: { posts: number } }[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/sidebar").then((r) => r.json()).then((d) => {
      if (d.me) {
        setMe(d.me);
        setCampus(d.campus);
        setCommunities(d.communities || []);
      }
    }).catch(() => {});
    fetch("/api/trending").then((r) => r.json()).then((d) => {
      if (!d.error) setHot({ posts: d.posts || [], events: d.events || [] });
    }).catch(() => {});
    fetch("/api/people/suggest").then((r) => r.json()).then((d) => {
      if (!d.error) setSuggest(d.suggestions || []);
    }).catch(() => {});
  }, []);

  async function toggleFollow(handle: string) {
    const target = suggest.find((s) => s.username === handle);
    if (!target) return;
    setSuggest((list) => list.filter((s) => s.username !== handle));
    await fetch(`/api/follow/@${handle}`, { method: "POST" }).catch(() => {});
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const tab = (key: string, icon: string, label: string, href?: string) => {
    const cls = `tw-navitem ${active === key ? "active" : ""}`;
    const inner = <><span>{icon}</span><span className="hidden xl:inline">{label}</span></>;
    return href ? <a className={cls} href={href}>{inner}</a> : <a className={cls}>{inner}</a>;
  };

  return (
    <div className="min-h-screen max-w-[1265px] mx-auto flex">
      {/* LEFT NAV */}
      <nav className="hidden sm:flex flex-col sticky top-0 h-screen w-[68px] xl:w-[275px] px-2 xl:px-4 py-2 border-r" style={{ borderColor: "var(--border)" }}>
        <div className="px-3 py-3 flex items-center">
          <BrandLogo height={26} priority />
        </div>
        {tab("home", "🏠", "Home", "/dashboard")}
        <a className="tw-navitem" href="/events"><span>📅</span><span className="hidden xl:inline">Events</span></a>
        <a className="tw-navitem" href="/resources"><span>📚</span><span className="hidden xl:inline">Resources</span></a>
        <a className="tw-navitem" href="/search"><span>🔍</span><span className="hidden xl:inline">Explore</span></a>
        <a className="tw-navitem"><span>🔔</span><span className="hidden xl:inline">Notifications</span></a>
        <a className="tw-navitem"><span>✉️</span><span className="hidden xl:inline">Messages</span></a>
        {tab("profile", "👤", "Profile", me?.username ? `/u/@${me.username}` : "/dashboard")}
        {me?.role === "ADMIN" && <a className="tw-navitem" href="/admin"><span>🛡</span><span className="hidden xl:inline">Admin</span></a>}
        {me?.role !== "ADMIN" && <a className="tw-navitem" href="/admin"><span>➕</span><span className="hidden xl:inline">Request admin</span></a>}
        <a className="tw-navitem"><span>⚙️</span><span className="hidden xl:inline">Settings</span></a>

        <button className="tw-postbtn hidden xl:block">Post</button>
        <div className="mt-auto flex items-center justify-between p-3 rounded-full hover:bg-white/5 cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={me?.avatarUrl} name={me?.displayName || me?.username || "?"} size={40} ring />
            <div className="hidden xl:block min-w-0">
              <div className="font-bold text-[15px] truncate">{me ? me.displayName : ""}</div>
              <div className="text-[13px] truncate" style={{ color: "var(--muted)" }}>@{me ? me.username : ""}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </nav>

      {/* CENTER */}
      <main className="flex-1 min-w-0 tw-colcenter">{children}</main>

      {/* RIGHT SIDEBAR */}
      <aside className="hidden lg:block w-[350px] shrink-0 p-4 space-y-4">
        <form className="tw-searchbar" onSubmit={submitSearch}>
          <input className="input" placeholder="🔍  Search CamPulse" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitSearch(e as any); }} />
        </form>

        <div className="tw-sidebarbox">
          <div className="p-4 font-bold text-[20px]">What&apos;s hot in {campus.shortName || "SRM"} 🔥</div>
          {hot.posts.length === 0 && hot.events.length === 0 ? (
            <div className="px-4 pb-4 text-[14px]" style={{ color: "var(--muted)" }}>Trending posts & events appear here.</div>
          ) : (
            <div className="pb-2">
              {hot.posts.map((p) => (
                <a key={p.id} href={p.author.username ? `/u/@${p.author.username}` : "#"} className="tw-trend block hover:bg-white/5">
                  <div className="text-[13px]" style={{ color: "var(--muted)" }}>
                    {p.author.username ? `@${p.author.username}` : (p.author.displayName || "Someone")} · ❤️ {p.likeCount}
                  </div>
                  <div className="text-[15px] font-semibold truncate">{p.body}</div>
                </a>
              ))}
              {hot.events.map((e) => (
                <a key={e.id} href="/events" className="tw-trend block hover:bg-white/5">
                  <div className="text-[13px]" style={{ color: "var(--muted)" }}>📅 Event · {e.rsvpCount} going</div>
                  <div className="text-[15px] font-semibold truncate">{e.title}</div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="tw-sidebarbox p-4">
          <div className="font-bold text-[20px] mb-3">Your communities</div>
          {communities.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-semibold text-[15px]">{c.name}</div>
                <div className="text-[13px]" style={{ color: "var(--muted)" }}>{c.description}</div>
              </div>
              <button className="btn-ghost" style={{ borderRadius: 9999, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}>Join</button>
            </div>
          ))}
          {communities.length === 0 && (
            <div className="text-[14px]" style={{ color: "var(--muted)" }}>No communities yet.</div>
          )}
        </div>

        <div className="tw-sidebarbox p-4">
          <div className="font-bold text-[20px] mb-3">People to follow</div>
          {suggest.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <a href={s.username ? `/u/@${s.username}` : "#"} className="flex items-center gap-2 min-w-0">
                <Avatar src={s.avatarUrl} name={s.displayName || s.username || "?"}
                  className="w-9 h-9 rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">{s.displayName || s.username}</div>
                  <div className="text-[13px] truncate" style={{ color: "var(--muted)" }}>
                    {s.username ? `@${s.username}` : ""} · {s._count.posts} posts
                  </div>
                </div>
              </a>
              <button className="btn-primary" style={{ borderRadius: 9999, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}
                onClick={() => toggleFollow(s.username!)}>Follow</button>
            </div>
          ))}
          {suggest.length === 0 && (
            <div className="text-[14px]" style={{ color: "var(--muted)" }}>You're following everyone worth following. 🎉</div>
          )}
        </div>
      </aside>
    </div>
  );
}
