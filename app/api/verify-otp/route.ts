import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOtp, verifyOtp } from "@/lib/otp";
import { emailDomain } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/password";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin", "campulse", "root", "support", "help", "mod", "moderator",
  "official", "api", "login", "signup", "dashboard", "onboarding", "verify",
  "null", "undefined",
]);

/**
 * After the OTP email is sent + entered, finish account creation:
 * verify the code, then set username + password + emailVerified.
 * Creates the user row if it doesn't exist yet (email-only pre-registration
 * is no longer used — verification + credentials happen together here).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  if (!HANDLE_RE.test(username)) {
    return NextResponse.json(
      { error: "Handle must be 3–20 chars: lowercase letters, numbers, underscore." },
      { status: 400 }
    );
  }
  if (RESERVED.has(username)) {
    return NextResponse.json({ error: "That handle is reserved." }, { status: 400 });
  }
  const pwErr = validatePassword(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  // Gate to a registered campus by email domain.
  const campus = await prisma.campus.findFirst({
    where: { emailDomain: emailDomain(email) },
  });
  if (!campus) {
    return NextResponse.json(
      { error: "This email domain isn't a registered campus yet." },
      { status: 403 }
    );
  }

  if (!checkOtp(email, code)) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  const taken = await prisma.user.findFirst({ where: { username } });
  if (taken) {
    return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Email already has an account — only allow if not yet verified.
    if (existing.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 }
      );
    }
    await verifyOtp(email, code); // consume
    await prisma.user.update({
      where: { email },
      data: { username, passwordHash, emailVerified: new Date() },
    });
  } else {
    await verifyOtp(email, code); // consume
    await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        emailVerified: new Date(),
        campusId: campus.id,
      },
    });
  }

  return NextResponse.json({ ok: true, campus: campus.shortName });
}
