"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [dept, setDept] = useState("");
  const [batch, setBatch] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, dept, batch, bio }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not save."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card p-8 w-full max-w-md">
        <BrandLogo height={32} className="mb-1" />
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Almost there. Add your display name and a few details.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Display name" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />

          <div className="flex gap-2">
            <input className="input" placeholder="Dept (e.g. CSE)" value={dept}
              onChange={(e) => setDept(e.target.value)} maxLength={20} />
            <input className="input" placeholder="Batch (e.g. 2023-2027)" value={batch}
              onChange={(e) => setBatch(e.target.value)} maxLength={20} />
          </div>

          <textarea className="input" placeholder="Short bio (optional)" value={bio}
            onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} />

          <button className="btn w-full" disabled={loading || displayName.trim().length < 2}>
            {loading ? "Saving…" : "Finish setup"}
          </button>
        </form>

        {err && <p className="text-sm mt-4" style={{ color: "#f87171" }}>{err}</p>}
      </div>
    </main>
  );
}
