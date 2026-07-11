"use client";
import { useState, useEffect } from "react";
import { SignOutButton } from "@/app/dashboard/signout";

interface Me { username: string | null; displayName: string; initial: string; role?: string; }
interface Comm { id: string; name: string; description: string | null; }

export function AppShell({ children, active }: { children: React.ReactNode; active?: "home" | "profile" | "explore" }) {
  const [me, setMe] = useState<Me | null>(null);
  const [campus, setCampus] = useState<{ shortName: string }>({ shortName: "" });
  const [communities, setCommunities] = useState<Comm[]>([]);
  const [trending, setTrending] = useState<Comm[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    fetch("/api/sidebar").then((r) => r.json()).then((d) => {
      if (d.me) {
        setMe(d.me);
        setCampus(d.campus);
        setCommunities(d.communities || []);
        setTrending(d.trending || []);
        setPostCount(d.postCount || 0);
        setEventCount(d.eventCount || 0);
      }
    }).catch(() => {});
  }, []);

  const tab = (key: string, icon: string, label: string, href?: string) => {
    const cls = `tw-navitem ${active === key ? "active" : ""}`;
    const inner = <><span>{icon}</span><span className="hidden xl:inline">{label}</span></>;
    return href ? <a className={cls} href={href}>{inner}</a> : <a className={cls}>{inner}</a>;
  };

  return (
    <div className="min-h-screen max-w-[1265px] mx-auto flex">
      {/* LEFT NAV */}
      <nav className="hidden sm:flex flex-col sticky top-0 h-screen w-[68px] xl:w-[275px] px-2 xl:px-4 py-2 border-r" style={{ borderColor: "var(--border)" }}>
        <div className="text-3xl font-black px-3 py-3" style={{ color: "var(--accent)" }}>𝕏</div>
        {tab("home", "🏠", "Home", "/dashboard")}
        {tab("explore", "🔍", "Explore")}
        <a className="tw-navitem"><span>🔔</span><span className="hidden xl:inline">Notifications</span></a>
        <a className="tw-navitem"><span>✉️</span><span className="hidden xl:inline">Messages</span></a>
        {tab("profile", "👤", "Profile", me?.username ? `/u/@${me.username}` : "/dashboard")}
        {me?.role === "ADMIN" && <a className="tw-navitem" href="/admin"><span>🛡</span><span className="hidden xl:inline">Admin</span></a>}
        <a className="tw-navitem"><span>⚙️</span><span className="hidden xl:inline">Settings</span></a>

        <button className="tw-postbtn hidden xl:block">Post</button>
        <div className="mt-auto flex items-center justify-between p-3 rounded-full hover:bg-white/5 cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <div className="tw-avatar" style={{ background: "var(--accent)", width: 40, height: 40 }}>
              {me ? me.initial : "?"}
            </div>
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
        <div className="tw-searchbar">
          <input className="input" placeholder="🔍  Search CamPulse" />
        </div>

        <div className="tw-sidebarbox">
          <div className="p-4 font-bold text-[20px]">What&apos;s happening · {campus.shortName}</div>
          {trending.length === 0 ? (
            <div className="px-4 pb-4 text-[14px]" style={{ color: "var(--muted)" }}>Communities will appear here.</div>
          ) : trending.map((c) => (
            <div key={c.id} className="tw-trend">
              <div className="text-[13px]" style={{ color: "var(--muted)" }}>Campus · Community</div>
              <div className="font-bold text-[15px]">{c.name}</div>
              <div className="text-[13px]" style={{ color: "var(--muted)" }}>{c.description}</div>
            </div>
          ))}
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

        <div className="text-[13px] px-2" style={{ color: "var(--muted)" }}>
          CamPulse · Campus super-app · {postCount} posts · {eventCount} events
        </div>
      </aside>
    </div>
  );
}
