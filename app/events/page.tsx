"use client";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";

interface Ev {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  sourceType: string;
  sourceHandle: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  rsvpCount: number;
  rsvpByMe: boolean;
}

const SRC_BADGE: Record<string, string> = {
  ADMIN: "🛡 Admin",
  SEED: "⭐ Curated",
  REDDIT: "🔺 Reddit",
  INSTAGRAM: "📸 Instagram",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");
  const [role, setRole] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const r = await fetch("/api/events");
      const d = await r.json();
      if (r.ok) { setEvents(d.events); setNextCursor(d.nextCursor ?? null); setHasMore(!!d.nextCursor); }
      else setErr(d.error || "Failed to load events.");
    } catch {
      setErr("Network error.");
    } finally {
      if (reset) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor || !hasMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/events?cursor=${encodeURIComponent(nextCursor)}`);
      const d = await r.json();
      if (r.ok) {
        setEvents((es) => [...es, ...d.events]);
        setNextCursor(d.nextCursor ?? null);
        setHasMore(!!d.nextCursor);
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, nextCursor, hasMore]);

  useEffect(() => {
    fetch("/api/sidebar").then((r) => r.json()).then((d) => {
      if (d.me) setRole(d.me.role || "");
    }).catch(() => {});
    load();
  }, [load]);

  async function toggleRsvp(id: string, going: boolean) {
    setEvents((es) => es.map((e) => e.id === id
      ? { ...e, rsvpByMe: !going, rsvpCount: e.rsvpCount + (going ? -1 : 1) }
      : e));
    try {
      const r = await fetch(`/api/events/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ going: !going }),
      });
      const d = await r.json();
      if (r.ok) setEvents((es) => es.map((e) => e.id === id
        ? { ...e, rsvpByMe: d.going, rsvpCount: d.count } : e));
    } catch {
      load();
    }
  }

  async function sync() {
    setSyncing(true); setSyncMsg("");
    try {
      const r = await fetch("/api/events?sync=1");
      const d = await r.json();
      if (r.ok) {
        setSyncMsg(`Synced ✓ Reddit: ${d.ingested?.reddit ?? 0}, Instagram: ${d.ingested?.instagram ?? 0}`);
        load();
      } else setSyncMsg(d.error || "Sync failed.");
    } catch {
      setSyncMsg("Sync failed (network).");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell active="home">
      <div className="tw-header px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">Events</div>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>
            {events.length} upcoming · from CamPulse & campus handles
          </div>
        </div>
        {role === "ADMIN" && (
          <button className="btn-ghost" style={{ borderRadius: 9999, padding: "8px 14px", fontWeight: 700 }}
            disabled={syncing} onClick={sync}>
            {syncing ? "Syncing…" : "↻ Sync handles"}
          </button>
        )}
      </div>

      {syncMsg && <p className="text-[13px] px-4 py-2" style={{ color: "var(--accent)" }}>{syncMsg}</p>}

      {err && <p className="text-sm px-4 py-2" style={{ color: "#f87171" }}>{err}</p>}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="tw-post p-8 text-center" style={{ color: "var(--muted)" }}>
          No events yet. Admins can sync the campus handles or create one.
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {events.map((ev) => (
            <article key={ev.id} className="tw-post p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                  {SRC_BADGE[ev.sourceType] || ev.sourceType}
                </span>
                {ev.sourceHandle && (
                  <a className="text-xs hover:underline" style={{ color: "var(--muted)" }}
                    href={ev.sourceUrl || "#"} target="_blank" rel="noreferrer">{ev.sourceHandle}</a>
                )}
              </div>
              <div className="font-bold text-[16px]">{ev.title}</div>
              <div className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
                📅 {new Date(ev.startsAt).toLocaleString()}
                {ev.location ? <> · 📍 {ev.location}</> : null}
              </div>
              {ev.description && (
                <p className="text-[14px] mt-2 whitespace-pre-wrap" style={{ color: "var(--muted)" }}>
                  {ev.description.slice(0, 280)}
                </p>
              )}
              {ev.imageUrl && (
                <img src={ev.imageUrl} alt="" className="mt-3 rounded-xl max-h-64 object-cover w-full"
                  onError={(e) => ((e.currentTarget.style.display = "none"))} />
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[13px]" style={{ color: "var(--muted)" }}>{ev.rsvpCount} going</span>
                <button
                  className={ev.rsvpByMe ? "btn" : "btn-ghost"}
                  style={ev.rsvpByMe ? { borderRadius: 9999, padding: "6px 16px", fontWeight: 700 } : { borderRadius: 9999, padding: "6px 16px", fontWeight: 700 }}
                  onClick={() => toggleRsvp(ev.id, ev.rsvpByMe)}>
                  {ev.rsvpByMe ? "✓ Going" : "Going"}
                </button>
              </div>
            </article>
          ))}
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
          {!hasMore && events.length > 0 && (
            <div className="text-center text-sm" style={{ color: "var(--muted)", padding: 24 }}>That's all the events ✦</div>
          )}
        </div>
      )}
    </AppShell>
  );
}
