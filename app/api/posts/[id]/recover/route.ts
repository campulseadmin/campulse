import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/recover — undo soft delete (author or admin). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  await prisma.post.update({ where: { id: params.id }, data: { isRemoved: false } });
  return NextResponse.json({ ok: true });
}
