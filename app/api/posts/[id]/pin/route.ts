import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/pin  { pinned?: boolean } — author pins to profile (max 1). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== me.id) return NextResponse.json({ error: "Only the author can pin." }, { status: 403 });

  const { pinned } = await req.json().catch(() => ({}) as any);
  const want = pinned !== false; // default true

  if (want) {
    // only one pinned post per author
    await prisma.postPref.updateMany({ where: { post: { authorId: me.id } }, data: { pinned: false } });
  }
  await prisma.postPref.upsert({
    where: { postId: post.id },
    update: { pinned: want }, create: { postId: post.id, pinned: want },
  });
  return NextResponse.json({ ok: true, pinned: want });
}
