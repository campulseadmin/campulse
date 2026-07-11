import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin", "campulse", "root", "support", "help", "mod", "moderator",
  "official", "api", "login", "signup", "dashboard", "onboarding", "verify",
  "profile", "u", "null", "undefined",
]);
const COOLDOWN_DAYS = 14;

/**
 * POST /api/profile/username — change your @handle.
 * Enforces Twitter-style rule: at most once per 14 days.
 */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { username } = await req.json().catch(() => ({ username: "" }));
  const next = String(username || "").trim().toLowerCase();

  if (!HANDLE_RE.test(next)) {
    return NextResponse.json(
      { error: "Handle must be 3–20 chars: lowercase letters, numbers, underscore." },
      { status: 400 }
    );
  }
  if (RESERVED.has(next)) {
    return NextResponse.json({ error: "That handle is reserved." }, { status: 400 });
  }
  if (next === me.username) {
    return NextResponse.json({ error: "That's already your handle." }, { status: 400 });
  }

  // 14-day cooldown.
  if (me.usernameChangedAt) {
    const wait = me.usernameChangedAt.getTime() + COOLDOWN_DAYS * 86_400_000 - Date.now();
    if (wait > 0) {
      const days = Math.ceil(wait / 86_400_000);
      return NextResponse.json(
        { error: `You can change your handle again in ${days} day${days === 1 ? "" : "s"}.` },
        { status: 429 }
      );
    }
  }

  const taken = await prisma.user.findFirst({ where: { username: next } });
  if (taken) {
    return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { username: next, usernameChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true, username: next });
}
