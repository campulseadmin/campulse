"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [step, setStep] = useState<"email" | "code">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState(params.get("verified") ? "Account created — sign in." : "");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function doPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const res = await signIn("credentials", { identifier, password, redirect: false });
      if (res?.error) { setErr("Invalid email, username or password."); return; }
      // Admins land in the admin portal; everyone else goes to the feed.
      const me = await fetch("/api/sidebar").then((r) => r.json()).catch(() => null);
      router.push(me?.me?.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch { setErr("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const r = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not send code."); return; }
      setStep("code");
      setMsg("Code sent to your inbox. Enter the 6-digit code below.");
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const v = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, code: otp }),
      });
      const vd = await v.json();
      if (!v.ok) { setErr(vd.error || "Invalid code."); return; }
      // Exchange the one-time grant for a session (passwordless).
      const res = await signIn("credentials", {
        identifier,
        grant: vd.grant,
        redirect: false,
      });
      if (res?.error) { setErr("Sign-in failed. Try password instead."); return; }
      const me = await fetch("/api/sidebar").then((r) => r.json()).catch(() => null);
      router.push(me?.me?.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  }

  function switchMode(next: "password" | "otp") {
    setMode(next);
    setStep("email");
    setOtp("");
    setErr(""); setMsg(params.get("verified") ? "Account created — sign in." : "");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-md">
        <BrandLogo height={34} className="mb-3" />
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {mode === "password"
            ? "Sign in with your email or @username + password."
            : step === "email"
            ? "Get a one-time code sent to your inbox."
            : "Enter the 6-digit code we emailed you."}
        </p>

        {mode === "password" ? (
          <form onSubmit={doPassword} className="space-y-3">
            <input
              className="input" type="text" placeholder="netid@srmist.edu.in or @username"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username"
            />
            <input
              className="input" type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            />
            <button className="btn w-full" disabled={loading}>
              {loading ? "Please wait…" : "Sign in"}
            </button>
          </form>
        ) : step === "email" ? (
          <form onSubmit={sendCode} className="space-y-3">
            <input
              className="input" type="email" placeholder="netid@srmist.edu.in"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username"
            />
            <button className="btn w-full" disabled={loading}>
              {loading ? "Sending…" : "Send me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-3">
            <input
              className="input" type="text" inputMode="numeric" placeholder="6-digit code"
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6} required autoFocus
            />
            <button className="btn w-full" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button" className="btn btn-ghost w-full"
              onClick={() => { setStep("email"); setOtp(""); setErr(""); }}
            >
              Use a different email
            </button>
          </form>
        )}

        <button
          type="button"
          className="btn btn-ghost w-full mt-3"
          onClick={() => switchMode(mode === "password" ? "otp" : "password")}
        >
          {mode === "password" ? "Sign in with an email code instead" : "Use password instead"}
        </button>

        <div className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          New here?{" "}
          <a href="/verify" className="font-semibold" style={{ color: "var(--accent)" }}>Create an account</a>
        </div>

        {msg && <p className="text-sm mt-4" style={{ color: "var(--accent2)" }}>{msg}</p>}
        {err && <p className="text-sm mt-4" style={{ color: "#f87171" }}>{err}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><div className="card p-8 w-full max-w-md text-center" style={{ color: "var(--muted)" }}>Loading…</div></main>}>
      <LoginInner />
    </Suspense>
  );
}
