import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/**
 * GET /api/trending — campus-scoped "What's hot in SRM".
 * Returns top viral posts (by like count) and top events (by RSVP count).
 */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const campusId = me.campusId;

  const [hotPosts, hotEvents] = await Promise.all([
    prisma.post.findMany({
      where: { campusId, isRemoved: false },
      orderBy: { likes: { _count: "desc" } },
      take: 5,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.event.findMany({
      where: { campusId, isApproved: true },
      orderBy: { rsvps: { _count: "desc" } },
      take: 5,
      include: { _count: { select: { rsvps: true } } },
    }),
  ]);

  return NextResponse.json({
    posts: hotPosts.map((p) => ({
      id: p.id,
      body: p.body,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      author: p.author,
    })),
    events: hotEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      rsvpCount: e._count.rsvps,
    })),
  });
}
