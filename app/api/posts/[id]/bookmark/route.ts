import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/bookmark — toggle save/unsave (bookmark). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const existing = await prisma.bookmark.findUnique({ where: { postId_userId: { postId: params.id, userId: me.id } } });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, bookmarked: false });
  }
  await prisma.bookmark.create({ data: { postId: params.id, userId: me.id } });
  return NextResponse.json({ ok: true, bookmarked: true });
}
