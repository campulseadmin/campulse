import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/comments/[cid]/like — toggle like on a comment. */
export async function POST(_req: Request, { params }: { params: { cid: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const comment = await prisma.comment.findFirst({
    where: { id: params.cid, isRemoved: false },
    include: { post: { select: { campusId: true } } },
  });
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.post.campusId !== me.campusId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId: params.cid, userId: me.id } },
  });
  let liked: boolean;
  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.commentLike.create({ data: { commentId: params.cid, userId: me.id } });
    liked = true;
  }
  const likeCount = await prisma.commentLike.count({ where: { commentId: params.cid } });
  return NextResponse.json({ ok: true, liked, likeCount });
}
