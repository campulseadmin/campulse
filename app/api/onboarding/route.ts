import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin", "campulse", "root", "support", "help", "mod", "moderator",
  "official", "api", "login", "signup", "dashboard", "onboarding", "null", "undefined",
]);

/** Complete onboarding: set @handle + display name (+ optional dept/batch/bio). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const displayName = String(body.displayName || "").trim();
  const dept = body.dept ? String(body.dept).trim() : null;
  const batch = body.batch ? String(body.batch).trim() : null;
  const bio = body.bio ? String(body.bio).trim().slice(0, 300) : null;

  if (displayName.length < 2 || displayName.length > 40) {
    return NextResponse.json(
      { error: "Display name must be 2–40 characters." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { displayName, dept, batch, bio },
  });

  return NextResponse.json({ ok: true });
}

/** Check handle availability (for live feedback while typing). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = String(url.searchParams.get("u") || "").trim().toLowerCase();
  if (!HANDLE_RE.test(username) || RESERVED.has(username)) {
    return NextResponse.json({ available: false });
  }
  const taken = await prisma.user.findFirst({ where: { username } });
  return NextResponse.json({ available: !taken });
}
