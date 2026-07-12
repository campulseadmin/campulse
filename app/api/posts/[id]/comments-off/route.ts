import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/comments-off  { off?: boolean } — author toggles comments. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== me.id) return NextResponse.json({ error: "Only the author can change this." }, { status: 403 });

  const { off } = await req.json().catch(() => ({}) as any);
  const want = off !== false;
  await prisma.postPref.upsert({
    where: { postId: post.id },
    update: { commentsOff: want }, create: { postId: post.id, commentsOff: want },
  });
  return NextResponse.json({ ok: true, commentsOff: want });
}
