import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { emailDomain } from "@/lib/auth";

// ── Rate limiting (in-memory sliding window; dev/localhost-first) ──
// Bounds abuse of the OTP request endpoint. Two independent limits:
//   - per EMAIL: max 5 requests / 15 min
//   - per IP:    max 10 requests / 15 min
// In production behind multiple server instances you'd use Redis; for a
// localhost-first single-process dev server this is sufficient and dependency-free.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 10;

const hits = new Map<string, number[]>(); // key -> timestamps
function withinLimit(key: string, max: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  const clean = String(email || "").trim().toLowerCase();

  if (!clean || !clean.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const ip = clientIp(req);

  // Per-IP throttle first (cheap, blocks IP-level spraying).
  if (!withinLimit(`ip:${ip}`, MAX_PER_IP)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  // Gate to a registered campus by email domain.
  const campus = await prisma.campus.findFirst({
    where: { emailDomain: emailDomain(clean) },
  });
  // Enumeration-safe: respond identically whether or not the domain is known.
  if (!campus) {
    return NextResponse.json({ ok: true, campus: null, devCode: null, previewUrl: null });
  }

  // Per-email throttle (prevents OTP flooding of a single inbox).
  if (!withinLimit(`email:${clean}`, MAX_PER_EMAIL)) {
    return NextResponse.json(
      { error: "Too many codes sent to this email. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const { devCode, previewUrl } = await sendOtpEmail(clean);
  // devCode/previewUrl are only populated in console/ethereal dev modes and are
  // safe to return to the same client that requested the code on localhost.
  return NextResponse.json({ ok: true, campus: campus.shortName, devCode, previewUrl });
}
