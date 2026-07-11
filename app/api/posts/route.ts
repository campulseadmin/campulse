import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/posts?sort=latest|top — campus-scoped feed, newest first, with counts + my-like flag. */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sort = new URL(req.url).searchParams.get("sort") === "top" ? "top" : "latest";

  const posts = await prisma.post.findMany({
    where: { campusId: me.campusId, isRemoved: false },
    orderBy: sort === "top"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      community: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
    },
  });

  const feed = posts.map((p) => ({
    id: p.id,
    body: p.body,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    author: p.author,
    community: p.community,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    likedByMe: p.likes.length > 0,
  }));

  return NextResponse.json({ posts: feed });
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
    return NextResponse.json({ error: "Post is too long (max 2000)." }, { status: 400 });
  }

  // If a community is given, ensure it belongs to this campus.
  if (communityId) {
    const c = await prisma.community.findFirst({
      where: { id: communityId, campusId: me.campusId },
    });
    if (!c) return NextResponse.json({ error: "Unknown community." }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      campusId: me.campusId,
      authorId: me.id,
      communityId,
      body: text,
    },
  });

  return NextResponse.json({ ok: true, id: post.id });
}
