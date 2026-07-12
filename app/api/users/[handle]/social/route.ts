import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/users/[handle]/social — follow/mute/block status for the 3-dot menu. */
export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const handle = params.handle.replace(/^@/, "").toLowerCase();
  const target = await prisma.user.findFirst({
    where: { username: handle, campusId: me.campusId },
    select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const [follow, mute, block, follower] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: target.id } } }),
    prisma.mute.findUnique({ where: { userId_kind_value: { userId: me.id, kind: "USER", value: target.id } } }),
    prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: me.id, blockedId: target.id } } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: target.id, followingId: me.id } } }),
  ]);

  return NextResponse.json({
    user: target,
    isMe: target.id === me.id,
    following: !!follow,
    followsMe: !!follower,
    muted: !!mute,
    blocked: !!block,
  });
}
