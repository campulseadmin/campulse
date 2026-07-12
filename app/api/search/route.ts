import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/**
 * GET /api/search?q=...  — campus-scoped.
 * - "#tag"  → posts whose body mentions that hashtag (case-insensitive).
 * - "@user" → users whose @username starts with it.
 * - plain   → posts containing the text AND users matching displayName/username.
 * Returns { posts: [...], users: [...] } (capped).
 */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const raw = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (!raw) return NextResponse.json({ posts: [], users: [] });

  const campusId = me.campusId;
  const isHash = raw.startsWith("#");
  const isHandle = raw.startsWith("@");
  const term = raw.replace(/^[#@]/, "").toLowerCase();

  let posts: any[] = [];
  let users: any[] = [];

  if (isHash && term) {
    // Posts mentioning the hashtag anywhere in the body.
    // NOTE: SQLite lacks case-insensitive `contains`, so we match case-sensitively
    // (e.g. "#Fest" won't match "#fest"). Postgres would allow mode:"insensitive".
    posts = await prisma.post.findMany({
      where: {
        campusId,
        isRemoved: false,
        body: { contains: term },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  } else if (isHandle && term) {
    users = await prisma.user.findMany({
      where: {
        campusId,
        isBanned: false,
        username: { not: null, startsWith: term },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, username: true, displayName: true, avatarUrl: true, _count: { select: { posts: true } } },
    });
  } else if (term) {
    const [p, u] = await Promise.all([
      prisma.post.findMany({
        where: { campusId, isRemoved: false, body: { contains: term } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          author: { select: { username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          campusId,
          isBanned: false,
          OR: [
            { username: { not: null, contains: term } },
            { displayName: { contains: term } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, username: true, displayName: true, avatarUrl: true, _count: { select: { posts: true } } },
      }),
    ]);
    posts = p;
    users = u;
  }

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      author: p.author,
    })),
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      postCount: u._count.posts,
    })),
  });
}
