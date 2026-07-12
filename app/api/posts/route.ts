import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const PAGE = 20;

function shape(p: any, meId: string) {
  return {
    id: p.id,
    body: p.body,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    author: p.author,
    community: p.community,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    likedByMe: p.likes.some((l: any) => l.userId === meId),
    bookmarkedByMe: p.bookmarks?.some((b: any) => b.userId === meId) ?? false,
    isMine: p.authorId === meId,
  };
}

/** GET /api/posts?sort=latest|top&cursor=<id>&limit=20
 *  Campus-scoped feed, campus-scoped infinite scroll.
 *  - latest: cursor-based (createdAt desc, id tiebreaker) for stable feeds.
 *  - top: offset-based (likes desc) — a bounded "top N" view.
 */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const sort = sp.get("sort") === "top" ? "top" : "latest";
  const limit = Math.min(parseInt(sp.get("limit") || "", 10) || PAGE, 50);
  const cursor = sp.get("cursor");

  let posts: any[];
  let nextCursor: string | null = null;

  if (sort === "top") {
    const skip = cursor ? parseInt(cursor, 10) : 0;
    posts = await prisma.post.findMany({
      where: { campusId: me.campusId, isRemoved: false },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      skip,
      take: limit + 1,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        community: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: me.id }, select: { id: true } },
        bookmarks: { where: { userId: me.id }, select: { id: true } },
      },
    });
    if (posts.length > limit) { posts.pop(); nextCursor = String(skip + limit); }
  } else {
    // Cursor pagination by (createdAt desc, id desc).
    const where: any = { campusId: me.campusId, isRemoved: false };
    if (cursor) {
      // cursor encodes createdAtISO|id
      const [ts, id] = cursor.split("|");
      where.OR = [
        { createdAt: { lt: new Date(ts) } },
        { createdAt: new Date(ts), id: { lt: id } },
      ];
    }
    posts = await prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        community: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: me.id }, select: { id: true } },
        bookmarks: { where: { userId: me.id }, select: { id: true } },
      },
    });
    if (posts.length > limit) {
      const last = posts.pop()!;
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }
  }

  return NextResponse.json({ posts: posts.map((p) => shape(p, me.id)), nextCursor });
}

/** POST /api/posts — create a post in the caller's campus. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  const communityId = body.communityId ? String(body.communityId) : null;

  if (!text) return NextResponse.json({ error: "Post can't be empty." }, { status: 400 });
  if (text.length > 2000) {
    return NextResponse.json({ error: "Post is too long (max 2000).", status: 400 } as any);
  }

  if (communityId) {
    const c = await prisma.community.findFirst({
      where: { id: communityId, campusId: me.campusId },
    });
    if (!c) return NextResponse.json({ error: "Unknown community." }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: { campusId: me.campusId, authorId: me.id, communityId, body: text },
  });

  return NextResponse.json({ ok: true, id: post.id });
}
