"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "setup">("code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const r = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not send code."); return; }
      setStep("setup");
      setMsg("Code sent to your inbox. Check your email.");
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, username, password }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not verify."); return; }
      router.push("/login?verified=1");
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  const handleOk = /^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase());

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-md">
        <BrandLogo height={32} />

        {step === "code" ? (
          <>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Enter your campus email to get a verification code.
            </p>
            <form onSubmit={sendCode} className="space-y-3">
              <input
                className="input" type="email" placeholder="netid@srmist.edu.in"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
              <button className="btn w-full" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              We sent a 6-digit code to <b>{email}</b>. Enter it, then set your handle & password.
            </p>
            <form onSubmit={finish} className="space-y-3">
              <input
                className="input" type="text" inputMode="numeric" placeholder="6-digit code"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6} required
              />
              <div className="flex items-center">
                <span className="px-3 py-2 rounded-l-lg text-sm"
                  style={{ background: "var(--bg)", color: "var(--muted)" }}>@</span>
                <input
                  className="input" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                  placeholder="handle" value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  maxLength={20} required
                />
              </div>
              <input
                className="input" type="password" placeholder="Choose a password (min 8 chars)"
                value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required
              />
              <button className="btn w-full" disabled={loading || !handleOk}>
                {loading ? "Creating account…" : "Verify & create account"}
              </button>
            </form>
            <button
              type="button" className="btn btn-ghost w-full mt-3"
              onClick={() => { setStep("code"); setErr(""); setMsg(""); }}
            >
              Use a different email
            </button>
          </>
        )}

        {msg && <p className="text-sm mt-4" style={{ color: "var(--accent2)" }}>{msg}</p>}
        {err && <p className="text-sm mt-4" style={{ color: "#f87171" }}>{err}</p>}
      </div>
    </main>
  );
}
