import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import crypto from "crypto";

/**
 * OTP-only sign-in (step 1): verify the emailed code for an already-verified
 * account. On success, mint a short-lived OTP grant token (one-time, 2 min)
 * that the client exchanges via the credentials provider (see lib/auth.ts).
 * We never put the password in play — the grant IS the credential for this login.
 */
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({ email: "", code: "" }));
  const clean = String(email || "").trim().toLowerCase();
  const c = String(code || "").trim();

  if (!clean || !/^\d{6}$/.test(c)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: clean } });
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: "No verified account for that email." }, { status: 404 });
  }
  if (user.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const ok = await verifyOtp(clean, c);
  if (!ok) return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });

  // One-time OTP grant, valid 2 minutes. Stored hashed; consumed on use.
  const grant = crypto.randomBytes(16).toString("hex");
  const secret = process.env.NEXTAUTH_SECRET || "dev";
  const grantHash = crypto.createHmac("sha256", secret).update(grant).digest("hex");
  await prisma.otpGrant.upsert({
    where: { email: clean },
    update: { grantHash, expiresAt: new Date(Date.now() + 2 * 60_000) },
    create: { email: clean, grantHash, expiresAt: new Date(Date.now() + 2 * 60_000) },
  });

  return NextResponse.json({ ok: true, grant });
}
