import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/not-interested — "show me fewer like this" (recommendation signal). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const post = await prisma.post.findFirst({ where: { id: params.id, campusId: me.campusId } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  await prisma.notInterested.upsert({
    where: { userId_postId: { userId: me.id, postId: post.id } },
    update: {}, create: { userId: me.id, postId: post.id },
  });
  return NextResponse.json({ ok: true });
}
