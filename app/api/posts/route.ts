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
  const mode = sp.get("mode") === "following" ? "following" : "all";
  const limit = Math.min(parseInt(sp.get("limit") || "", 10) || PAGE, 50);
  const cursor = sp.get("cursor");

  // Personalization: who/what to hide from this user's feed.
  const [following, mutes, blocks, hidden] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: me.id }, select: { followingId: true } }),
    prisma.mute.findMany({ where: { userId: me.id }, select: { kind: true, value: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: me.id }, { blockedId: me.id }] }, select: { blockerId: true, blockedId: true } }),
    prisma.hiddenPost.findMany({ where: { userId: me.id }, select: { postId: true } }),
  ]);
  const followingIds = following.map((f) => f.followingId);
  const blockedIds = blocks.flatMap((b) => [b.blockerId, b.blockedId]);
  const mutedUserIds = mutes.filter((m) => m.kind === "USER").map((m) => m.value);
  const mutedTags = mutes.filter((m) => m.kind === "HASHTAG").map((m) => m.value);
  const mutedTopics = mutes.filter((m) => m.kind === "TOPIC").map((m) => m.value);
  const hiddenIds = hidden.map((h) => h.postId);

  const baseWhere: any = { campusId: me.campusId, isRemoved: false };
  if (mode === "following") {
    baseWhere.authorId = { in: [...followingIds, me.id] };
  }
  // hide blocked + muted users + hidden posts + my own muted topics/tags
  baseWhere.AND = [
    { authorId: { notIn: [...Array.from(blockedIds), ...Array.from(mutedUserIds)] } },
    { id: { notIn: [...Array.from(hiddenIds)] } },
  ];
  if (mutedTags.length || mutedTopics.length) {
    // if a post body contains a muted hashtag/topic, exclude it
    const contains: any[] = [];
    mutedTags.forEach((t) => contains.push({ body: { contains: `#${t}` } }));
    mutedTopics.forEach((t) => contains.push({ body: { contains: t } }));
    if (contains.length) baseWhere.AND.push({ NOT: { OR: contains } });
  }
  let posts: any[];
  let nextCursor: string | null = null;

  if (sort === "top") {
    const skip = cursor ? parseInt(cursor, 10) : 0;
    posts = await prisma.post.findMany({
      where: baseWhere,
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
    const where: any = { ...baseWhere };
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
