import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/posts/[id]/comments — list comments (with reply + like counts). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({
    where: { id: params.id, campusId: me.campusId, isRemoved: false },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { postId: params.id, isRemoved: false },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
    },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      parentId: c.parentId,
      author: c.author,
      likeCount: c._count.likes,
      replyCount: c._count.replies,
      likedByMe: c.likes.length > 0,
    })),
  });
}

/** POST /api/posts/[id]/comments — add a comment (optionally a reply). */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({
    where: { id: params.id, campusId: me.campusId, isRemoved: false },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  const parentId = body.parentId ? String(body.parentId) : null;
  if (!text) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  if (text.length > 1000) {
    return NextResponse.json({ error: "Comment too long (max 1000)." }, { status: 400 });
  }
  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId: params.id } });
    if (!parent) return NextResponse.json({ error: "Parent comment not found." }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { postId: params.id, authorId: me.id, body: text, parentId },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      author: comment.author,
      likeCount: comment._count.likes,
      replyCount: comment._count.replies,
      likedByMe: false,
    },
  });
}
