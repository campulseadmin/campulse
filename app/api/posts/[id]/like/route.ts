import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/like — toggle like for the current user. */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const postId = params.id;
  const post = await prisma.post.findFirst({
    where: { id: postId, campusId: me.campusId, isRemoved: false },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId: me.id } },
  });

  let liked: boolean;
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({ data: { postId, userId: me.id } });
    liked = true;
    // notify the post author (skip self + blocked)
    if (post.authorId !== me.id) {
      await prisma.notification.create({
        data: { userId: post.authorId, type: "LIKE", actorId: me.id, postId },
      }).catch(() => {});
    }
  }

  const likeCount = await prisma.like.count({ where: { postId } });
  return NextResponse.json({ ok: true, liked, likeCount });
}
