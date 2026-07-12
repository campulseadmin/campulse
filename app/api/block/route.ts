import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/block { handle } — block a user (mutual hide). */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { handle } = await req.json().catch(() => ({}) as any);
  const h = String(handle || "").replace(/^@/, "").toLowerCase();
  const t = await prisma.user.findFirst({ where: { username: h, campusId: me.campusId } });
  if (!t) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (t.id === me.id) return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: t.id } },
    update: {}, create: { blockerId: me.id, blockedId: t.id },
  });
  await prisma.follow.deleteMany({ where: { OR: [
    { followerId: me.id, followingId: t.id }, { followerId: t.id, followingId: me.id },
  ] } });
  return NextResponse.json({ ok: true, blocked: true });
}

/** DELETE /api/block?handle= — unblock. */
export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const h = (new URL(req.url).searchParams.get("handle") || "").replace(/^@/, "").toLowerCase();
  const t = await prisma.user.findFirst({ where: { username: h, campusId: me.campusId } });
  if (!t) return NextResponse.json({ error: "User not found." }, { status: 404 });
  await prisma.block.deleteMany({ where: { blockerId: me.id, blockedId: t.id } });
  return NextResponse.json({ ok: true, blocked: false });
}
