"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileActions({
  username, displayName, bio, dept, batch, cooldownUntil,
}: {
  username: string;
  displayName: string;
  bio: string;
  dept: string;
  batch: string;
  cooldownUntil: number;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [handleOpen, setHandleOpen] = useState(false);
  const [dName, setDName] = useState(displayName);
  const [dBio, setDBio] = useState(bio);
  const [dDept, setDDept] = useState(dept);
  const [dBatch, setDBatch] = useState(batch);
  const [newHandle, setNewHandle] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const locked = cooldownUntil > Date.now();
  const daysLeft = Math.ceil((cooldownUntil - Date.now()) / 86_400_000);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: dName, dept: dDept, batch: dBatch, bio: dBio }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not save."); return; }
      setOk("Profile updated.");
      setTimeout(() => { setEditOpen(false); setOk(""); router.refresh(); }, 700);
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  async function changeHandle(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/profile/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newHandle }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not change handle."); return; }
      setOk(`Handle changed to @${d.username}.`);
      setTimeout(() => { setHandleOpen(false); setOk(""); router.refresh(); }, 700);
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className="flex gap-2 mt-4">
        <button className="btn-ghost" style={{ borderRadius: 9999, padding: "8px 16px", fontWeight: 700, border: "1px solid var(--border)" }} onClick={() => { setEditOpen(true); setErr(""); setOk(""); }}>
          Edit profile
        </button>
        <button className="btn-ghost" style={{ borderRadius: 9999, padding: "8px 16px", fontWeight: 700, border: "1px solid var(--border)", opacity: locked ? 0.5 : 1 }} disabled={locked} onClick={() => { setHandleOpen(true); setErr(""); setOk(""); setNewHandle(""); }}>
          Change @handle
        </button>
      </div>

      {locked && (
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          You can change your handle again in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
        </p>
      )}

      {editOpen && (
        <Modal onClose={() => setEditOpen(false)}>
          <h3 className="text-lg font-bold mb-4">Edit profile</h3>
          <form onSubmit={saveProfile} className="space-y-3">
            <input className="input" placeholder="Display name" value={dName} onChange={(e) => setDName(e.target.value)} maxLength={40} required />
            <input className="input" placeholder="Dept (e.g. CSE)" value={dDept} onChange={(e) => setDDept(e.target.value)} maxLength={20} />
            <input className="input" placeholder="Batch (e.g. 2023-2027)" value={dBatch} onChange={(e) => setDBatch(e.target.value)} maxLength={20} />
            <textarea className="input" placeholder="Bio" value={dBio} onChange={(e) => setDBio(e.target.value)} maxLength={300} rows={3} />
            {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
            {ok && <p className="text-sm" style={{ color: "var(--accent2)" }}>{ok}</p>}
            <button className="btn w-full" disabled={loading || dName.trim().length < 2}>{loading ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
      )}

      {handleOpen && (
        <Modal onClose={() => setHandleOpen(false)}>
          <h3 className="text-lg font-bold mb-1">Change your @handle</h3>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            You can change your handle at most once every 14 days.
          </p>
          <form onSubmit={changeHandle} className="space-y-3">
            <div className="flex items-center">
              <span className="px-3 py-2 rounded-l-lg text-sm" style={{ background: "var(--bg)", color: "var(--muted)" }}>@</span>
              <input
                className="input" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                placeholder="newhandle" value={newHandle}
                onChange={(e) => setNewHandle(e.target.value.toLowerCase())} maxLength={20} required
              />
            </div>
            {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
            {ok && <p className="text-sm" style={{ color: "var(--accent2)" }}>{ok}</p>}
            <button className="btn w-full" disabled={loading || !/^[a-z0-9_]{3,20}$/.test(newHandle)}>{loading ? "Changing…" : "Change handle"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
