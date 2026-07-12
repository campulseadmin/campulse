"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

type ReqStatus = "PENDING" | "APPROVED" | "REJECTED" | null;

export function RequestAccess({ requesterName }: { requesterName: string }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<ReqStatus>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/request");
      const d = await r.json();
      if (r.ok) setStatus(d.request?.status ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not submit."); return; }
      setStatus("PENDING");
    } catch { setErr("Network error."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <div className="w-full max-w-md mt-16">
        <BrandLogo height={32} />
        <h1 className="text-2xl font-bold mt-6">Request admin access</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Hi {requesterName}, admin access is granted by an existing campus admin. Send a request
          with a short reason and wait for approval.
        </p>

        {loading ? (
          <p className="text-sm mt-6" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : status === "PENDING" ? (
          <div className="card p-5 mt-6">
            <div className="font-bold" style={{ color: "var(--accent)" }}>✓ Request pending</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              An admin will review your request. You'll get admin access once approved.
            </p>
          </div>
        ) : status === "APPROVED" ? (
          <div className="card p-5 mt-6">
            <div className="font-bold" style={{ color: "var(--green)" }}>✓ Approved</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              You now have admin access. <Link href="/admin" className="underline" style={{ color: "var(--accent)" }}>Open the admin portal</Link>.
            </p>
          </div>
        ) : status === "REJECTED" ? (
          <div className="card p-5 mt-6">
            <div className="font-bold" style={{ color: "#f87171" }}>Request rejected</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Your last request was not approved. You can submit a new one below.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <textarea className="input" rows={3} placeholder="Why should you be an admin? (optional)"
                value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
              <button className="btn w-full" disabled={busy}>{busy ? "Submitting…" : "Submit new request"}</button>
            </form>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <textarea className="input" rows={3} placeholder="Why should you be an admin? (optional)"
              value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <button className="btn w-full" disabled={busy}>{busy ? "Submitting…" : "Request admin access"}</button>
            {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
          </form>
        )}

        <Link href="/dashboard" className="block text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
          ← Back to app
        </Link>
      </div>
    </div>
  );
}
