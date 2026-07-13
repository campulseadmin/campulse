"use client";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";

interface Res {
  id: string;
  title: string;
  type: string;
  dept: string | null;
  semester: number | null;
  driveUrl: string;
  description: string | null;
  uploadedBy: { displayName: string | null; username: string | null };
}

const TYPES = ["NOTE", "PYQ", "MATERIAL"];
const DEPTS = ["CSE", "ECE", "AIML", "EEE", "MECH", "CIVIL", "IT"];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Res[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ dept: "", semester: "", type: "", q: "" });

  // submit form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "PYQ", dept: "CSE", semester: "3", driveUrl: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (filters.dept) qs.set("dept", filters.dept);
      if (filters.semester) qs.set("semester", filters.semester);
      if (filters.type) qs.set("type", filters.type);
      if (filters.q) qs.set("q", filters.q);
      const r = await fetch(`/api/resources?${qs.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      setResources(d.resources);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      const r = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Submit failed");
      setMsg("Submitted! It appears publicly after an admin approves it.");
      setForm({ title: "", type: "PYQ", dept: "CSE", semester: "3", driveUrl: "", description: "" });
      setShowForm(false);
    } catch (e: any) {
      setMsg(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">📚 Study Hub</h1>
          <button className="tw-btn-primary text-sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close" : "+ Share a resource"}
          </button>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Notes, PYQs &amp; materials shared by SRM students. Student-contributed — not scraped from other sites.
        </p>

        <input
          className="tw-input w-full mb-4"
          placeholder="Search — try “OOPS Unit 3 notes” or “EEE previous year paper”"
          value={filters.q || ""}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />

        {showForm && (
          <form onSubmit={submit} className="tw-card p-4 mb-4 space-y-3">
            <input className="tw-input" placeholder="Title (e.g. DBMS Unit 3 PYQ)" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div className="flex gap-2">
              <select className="tw-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="tw-input" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
                {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input className="tw-input w-24" type="number" min={1} max={8} placeholder="Sem" value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
            <input className="tw-input" placeholder="Google Drive share link" value={form.driveUrl}
              onChange={(e) => setForm({ ...form, driveUrl: e.target.value })} required />
            <textarea className="tw-input" placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button className="tw-btn-primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit for approval"}</button>
            {msg && <p className="text-sm text-amber-300">{msg}</p>}
          </form>
        )}

        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          <select className="tw-input w-auto" value={filters.dept} onChange={(e) => setFilters({ ...filters, dept: e.target.value })}>
            <option value="">All depts</option>
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="tw-input w-auto" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="tw-input w-auto" value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
            <option value="">All sems</option>
            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>

        {loading && <p className="text-white/50">Loading…</p>}
        {err && <p className="text-red-400">{err}</p>}
        {!loading && !err && resources.length === 0 && (
          <p className="text-white/50">No resources yet. Be the first to share one!</p>
        )}

        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="tw-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="tw-badge">{r.type}</span>
                {r.dept && <span className="tw-badge">{r.dept}</span>}
                {r.semester && <span className="tw-badge">Sem {r.semester}</span>}
              </div>
              <a href={r.driveUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                {r.title} ↗
              </a>
              {r.description && <p className="text-sm text-white/60 mt-1">{r.description}</p>}
              <p className="text-xs text-white/40 mt-2">
                shared by {r.uploadedBy?.displayName || r.uploadedBy?.username || "a student"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
