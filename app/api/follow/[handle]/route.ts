import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST/DELETE /api/follow/[handle] — toggle follow of @handle. */
export async function POST(_req: Request, { params }: { params: { handle: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const handle = params.handle.replace(/^@/, "").toLowerCase();

  const target = await prisma.user.findFirst({ where: { username: handle, campusId: me.campusId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });

  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: target.id } } });
  if (existing) return NextResponse.json({ ok: true, following: true });

  await prisma.follow.create({ data: { followerId: me.id, followingId: target.id } });
  // Notification (skip if target muted/blocked us — handled by feed, but don't notify blockers).
  await prisma.notification.create({
    data: { userId: target.id, type: "FOLLOW", actorId: me.id },
  }).catch(() => {});
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(_req: Request, { params }: { params: { handle: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const handle = params.handle.replace(/^@/, "").toLowerCase();

  const target = await prisma.user.findFirst({ where: { username: handle, campusId: me.campusId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await prisma.follow.deleteMany({ where: { followerId: me.id, followingId: target.id } });
  return NextResponse.json({ ok: true, following: false });
}
