import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const KINDS = new Set(["USER", "HASHTAG", "TOPIC"]);

/** POST /api/mute  { kind: USER|HASHTAG|TOPIC, value } — mute without blocking. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { kind, value } = await req.json().catch(() => ({}) as any);
  const k = String(kind || "USER").toUpperCase();
  const v = String(value || "").trim().toLowerCase().replace(/^#/, "");
  if (!KINDS.has(k)) return NextResponse.json({ error: "Invalid mute kind." }, { status: 400 });
  if (!v) return NextResponse.json({ error: "Mute target required." }, { status: 400 });
  if (k === "USER") {
    const t = await prisma.user.findFirst({ where: { username: v, campusId: me.campusId } });
    if (!t) return NextResponse.json({ error: "User not found." }, { status: 404 });
    await prisma.mute.upsert({
      where: { userId_kind_value: { userId: me.id, kind: k, value: t.id } },
      update: {}, create: { userId: me.id, kind: k, value: t.id },
    });
  } else {
    await prisma.mute.upsert({
      where: { userId_kind_value: { userId: me.id, kind: k, value: v } },
      update: {}, create: { userId: me.id, kind: k, value: v },
    });
  }
  return NextResponse.json({ ok: true, muted: true, kind: k, value: v });
}

/** DELETE /api/mute?kind=&value= — unmute. */
export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const k = (sp.get("kind") || "USER").toUpperCase();
  const v = sp.get("value")?.trim().toLowerCase().replace(/^#/, "");
  if (!v) return NextResponse.json({ error: "Mute target required." }, { status: 400 });
  const value = k === "USER"
    ? (await prisma.user.findFirst({ where: { username: v, campusId: me.campusId } }))?.id ?? v
    : v;
  await prisma.mute.deleteMany({ where: { userId: me.id, kind: k, value } });
  return NextResponse.json({ ok: true, muted: false });
}
