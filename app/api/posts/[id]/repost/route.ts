import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/posts/[id]/repost  { body? } — repost (or quote if body given). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const source = await prisma.post.findFirst({
    where: { id: params.id, campusId: me.campusId, isRemoved: false },
  });
  if (!source) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (source.authorId === me.id) return NextResponse.json({ error: "You can't repost your own post." }, { status: 400 });

  const body = (await req.json().catch(() => ({}) as any)).body?.trim() || null;
  const isQuote = !!body;

  // one repost/quote per (user, source, kind)
  const existing = await prisma.repost.findUnique({
    where: { userId_sourceId_kind: { userId: me.id, sourceId: source.id, kind: isQuote ? "QUOTE" : "REPOST" } },
  });
  if (existing) return NextResponse.json({ ok: true, already: true, postId: existing.postId });

  const post = await prisma.post.create({
    data: {
      campusId: me.campusId, authorId: me.id, body: body || "",
      quotedId: isQuote ? source.id : null,
    },
  });
  await prisma.repost.create({
    data: { postId: post.id, userId: me.id, sourceId: source.id, kind: isQuote ? "QUOTE" : "REPOST" },
  });
  if (!isQuote) {
    await prisma.notification.create({ data: { userId: source.authorId, type: "REPOST", actorId: me.id, postId: source.id } }).catch(() => {});
  }
  return NextResponse.json({ ok: true, postId: post.id, quote: isQuote });
}
