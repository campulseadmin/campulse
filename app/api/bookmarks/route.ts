import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/bookmarks — current user's saved posts (campus-scoped). */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const bms = await prisma.bookmark.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          author: { select: { username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  const posts = bms
    .map((b) => b.post)
    .filter((p): p is NonNullable<typeof p> => !!p && !p.isRemoved)
    .map((p) => ({
      id: p.id, body: p.body, imageUrl: p.imageUrl, createdAt: p.createdAt,
      author: p.author, likeCount: p._count.likes, commentCount: p._count.comments,
    }));

  return NextResponse.json({ posts });
}
