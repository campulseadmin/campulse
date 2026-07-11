import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/posts/[id]/comments — list comments for a post. */
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
    },
  });

  return NextResponse.json({ comments });
}

/** POST /api/posts/[id]/comments — add a comment. */
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
  if (!text) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  if (text.length > 1000) {
    return NextResponse.json({ error: "Comment too long (max 1000)." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { postId: params.id, authorId: me.id, body: text },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ ok: true, comment });
}
