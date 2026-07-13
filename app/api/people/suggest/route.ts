import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

// GET /api/people/suggest — SRM users the caller does NOT yet follow,
// ranked by post count (most active first). The connective tissue that turns
// a content site into a network. Caps at 5.
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const following = await prisma.follow.findMany({
    where: { followerId: me.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  // Exclude users who have BLOCKED me (they don't want contact).
  const blockedBy = await prisma.block.findMany({
    where: { blockedId: me.id },
    select: { blockerId: true },
  });
  const blockedByIds = blockedBy.map((b) => b.blockerId);

  const suggestions = await prisma.user.findMany({
    where: {
      campusId: me.campusId,
      id: { notIn: [...followingIds, ...blockedByIds, me.id] },
      isBanned: false,
    },
    orderBy: { posts: { _count: "desc" } },
    take: 5,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      _count: { select: { posts: true } },
    },
  });

  return NextResponse.json({ suggestions });
}
