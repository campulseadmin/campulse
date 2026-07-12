"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface U { id: string; username: string | null; displayName: string | null; email: string; role: string; isBanned: boolean; emailVerified: Date | null; createdAt: string; _count: { posts: number }; }
interface R { id: string; reason: string; details: string | null; status: string; createdAt: string; reporter: { username: string | null; displayName: string | null }; post: { id: string; body: string; isRemoved: boolean } | null; }
interface E { id: string; title: string; description: string | null; location: string | null; startsAt: string; endsAt: string | null; isApproved: boolean; _count: { rsvps: number }; }

export function AdminPanel({ adminName, initialTab = "users" }: { adminName: string; initialTab?: "users" | "reports" | "events" | "requests" }) {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab: "users" | "reports" | "events" | "requests" =
    tabParam === "reports" || tabParam === "events" || tabParam === "requests" ? tabParam : initialTab;
  return (
    <div>
      <div className="px-4 py-3">
        <div className="text-xl font-bold">Admin · {adminName}</div>
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>Campus moderation & management</div>
      </div>
      <div className="p-4 pb-16">
        {tab === "users" && <UsersTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "events" && <EventsTab />}
        {tab === "requests" && <RequestsTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users");
    const d = await r.json();
    if (r.ok) setUsers(d.users); else setErr(d.error || "Failed.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string, role?: string) {
    setBusy(id + action); setErr("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, role }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setErr(d.error || "Failed."); return; }
    load();
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
      {users.map((u) => (
        <div key={u.id} className="tw-post p-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-bold text-[15px]">{u.displayName || u.username}</div>
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>@{u.username} · {u.email}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
              {u.role}
              {u.isBanned ? " · 🚫 banned" : ""}
              {!u.emailVerified ? " · ⚠ not verified" : ""}
              {" · "}{u._count.posts} posts
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <select
              disabled={busy === u.id + "role"} value={u.role}
              onChange={(e) => act(u.id, "role", e.target.value)}
              className="input" style={{ width: 120, padding: "6px" }}
            >
              <option value="STUDENT">Student</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>
            {u.isBanned ? (
              <button className="btn-ghost" style={{ borderRadius: 9999, padding: "6px 12px" }} disabled={!!busy} onClick={() => act(u.id, "unban")}>Unban</button>
            ) : (
              <button className="btn-ghost" style={{ borderRadius: 9999, padding: "6px 12px", color: "#f87171" }} disabled={!!busy} onClick={() => act(u.id, "ban")}>Ban</button>
            )}
          </div>
        </div>
      ))}
      {users.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No users.</p>}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<R[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/reports");
    const d = await r.json();
    if (r.ok) setReports(d.reports); else setErr(d.error || "Failed.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string) {
    setBusy(id + action); setErr("");
    const r = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setErr(d.error || "Failed."); return; }
    load();
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
      {reports.map((r) => (
        <div key={r.id} className="tw-post p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: "var(--muted)" }}>
              {r.reporter?.displayName || r.reporter?.username || "Someone"} reported · {r.reason} · {r.status}
            </span>
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          {r.post && (
            <p className="text-[14px] mt-2 p-2 rounded" style={{ background: "var(--bg)" }}>
              {r.post.body.slice(0, 200)}{r.post.isRemoved ? " (removed)" : ""}
            </p>
          )}
          {r.details && <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>“{r.details}”</p>}
          {r.status === "OPEN" && (
            <div className="flex gap-2 mt-3">
              <button className="btn" style={{ padding: "6px 14px" }} disabled={!!busy} onClick={() => act(r.id, "remove")}>Remove post</button>
              <button className="btn-ghost" style={{ borderRadius: 9999, padding: "6px 14px" }} disabled={!!busy} onClick={() => act(r.id, "dismiss")}>Dismiss</button>
            </div>
          )}
        </div>
      ))}
      {reports.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No reports.</p>}
    </div>
  );
}

function EventsTab() {
  const [events, setEvents] = useState<E[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/events");
    const d = await r.json();
    if (r.ok) setEvents(d.events); else setErr(d.error || "Failed.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, location: location || null, startsAt }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Failed."); return; }
    setTitle(""); setLocation(""); setStartsAt(""); load();
  }

  async function approve(id: string) {
    setBusy(id); setErr("");
    const r = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setErr(d.error || "Failed."); return; }
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="tw-post p-4 space-y-2">
        <div className="font-bold text-[15px]">Create event</div>
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        <button className="btn" disabled={!title || !startsAt}>Create</button>
      </form>

      {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
      {events.map((ev) => (
        <div key={ev.id} className="tw-post p-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-bold text-[15px]">{ev.title}</div>
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>
              {ev.location ? ev.location + " · " : ""}{new Date(ev.startsAt).toLocaleString()} · {ev._count.rsvps} going
              {!ev.isApproved ? " · ⏳ pending" : ""}
            </div>
          </div>
          {!ev.isApproved && (
            <button className="btn" style={{ padding: "6px 14px" }} disabled={busy === ev.id} onClick={() => approve(ev.id)}>Approve</button>
          )}
        </div>
      ))}
      {events.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No events yet.</p>}
    </div>
  );
}

interface AR {
  id: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  requester: { id: string; username: string | null; displayName: string | null; email: string; role: string };
}

function RequestsTab() {
  const [requests, setRequests] = useState<AR[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/requests");
    const d = await r.json();
    if (r.ok) setRequests(d.requests); else setErr(d.error || "Failed.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id + action); setErr("");
    const r = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setErr(d.error || "Failed."); return; }
    load();
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
      {requests.map((r) => (
        <div key={r.id} className="tw-post p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[15px]">
              {r.requester.displayName || r.requester.username}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: r.status === "PENDING" ? "rgba(255,212,0,0.15)" : r.status === "APPROVED" ? "rgba(0,186,124,0.15)" : "rgba(248,113,113,0.15)",
                color: r.status === "PENDING" ? "#facc15" : r.status === "APPROVED" ? "#00ba7c" : "#f87171",
              }}
            >
              {r.status}
            </span>
          </div>
          <div className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
            @{r.requester.username} · {r.requester.email}
          </div>
          {r.reason && <p className="text-[14px] mt-2 p-2 rounded" style={{ background: "var(--bg)" }}>“{r.reason}”</p>}
          {r.status === "PENDING" && (
            <div className="flex gap-2 mt-3">
              <button className="btn" style={{ padding: "6px 14px" }} disabled={!!busy} onClick={() => act(r.id, "approve")}>
                {busy === r.id + "approve" ? "…" : "Approve → make admin"}
              </button>
              <button className="btn-ghost" style={{ borderRadius: 9999, padding: "6px 14px", color: "#f87171" }} disabled={!!busy} onClick={() => act(r.id, "reject")}>
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
      {requests.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No admin requests.</p>}
    </div>
  );
}
