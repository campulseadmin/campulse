import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** GET /api/posts/[id] — post detail with nested comments + flags. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({
    where: { id: params.id, campusId: me.campusId },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      community: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
      bookmarks: { where: { userId: me.id }, select: { id: true } },
    },
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
    post: {
      id: post.id,
      body: post.body,
      imageUrl: post.imageUrl,
      isRemoved: post.isRemoved,
      editedAt: post.editedAt,
      createdAt: post.createdAt,
      author: post.author,
      community: post.community,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likedByMe: post.likes.length > 0,
      bookmarkedByMe: post.bookmarks.length > 0,
      canEdit: post.authorId === me.id && Date.now() - post.createdAt.getTime() <= EDIT_WINDOW_MS,
      isMine: post.authorId === me.id,
    },
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

/** PATCH /api/posts/[id] — edit body (author only, within 15 min). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== me.id) return NextResponse.json({ error: "Not your post." }, { status: 403 });
  if (Date.now() - post.createdAt.getTime() > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: "Edit window (15 min) has passed." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  if (!text) return NextResponse.json({ error: "Post can't be empty." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Too long (max 2000)." }, { status: 400 });

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: { body: text, editedAt: new Date() },
  });
  return NextResponse.json({ ok: true, editedAt: updated.editedAt });
}

/** DELETE /api/posts/[id] — soft delete (author or admin). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  await prisma.post.update({ where: { id: params.id }, data: { isRemoved: true } });
  return NextResponse.json({ ok: true });
}
