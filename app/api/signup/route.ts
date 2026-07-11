import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailDomain } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/password";

/**
 * Register a new campus account with email + password.
 * Gates to a known campus domain. Does NOT verify inbox ownership (OTP deferred
 * until email delivery is configured — see lib/email.ts).
 */
export async function POST(req: Request) {
  const { email, password } = await req
    .json()
    .catch(() => ({ email: "", password: "" }));
  const clean = String(email || "").trim().toLowerCase();
  const pw = String(password || "");

  if (!clean || !clean.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const pwErr = validatePassword(pw);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const campus = await prisma.campus.findFirst({
    where: { emailDomain: emailDomain(clean) },
  });
  if (!campus) {
    return NextResponse.json(
      { error: "This email domain isn't a registered campus yet." },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: clean } });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(pw);
  await prisma.user.upsert({
    where: { email: clean },
    update: { passwordHash },
    create: { email: clean, passwordHash, campusId: campus.id },
  });

  return NextResponse.json({ ok: true, campus: campus.shortName });
}
