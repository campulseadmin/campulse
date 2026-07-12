import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const REASONS = ["spam", "harassment", "hate", "misinformation", "nsfw", "other"];

/** POST /api/posts/[id]/report — file a moderation report on a post. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const postId = params.id;
  const post = await prisma.post.findFirst({
    where: { id: postId, campusId: me.campusId, isRemoved: false },
    select: { id: true, authorId: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const reason = String(b.reason || "").toLowerCase();
  const details = b.details ? String(b.details).slice(0, 1000) : null;

  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Pick a reason." }, { status: 400 });
  }

  // Idempotent: don't let one user stack duplicate OPEN reports on the same post.
  const existing = await prisma.report.findFirst({
    where: { reporterId: me.id, postId, status: { in: ["OPEN", "REVIEWED"] } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, already: true });

  await prisma.report.create({
    data: {
      reporterId: me.id,
      postId,
      reason,
      details,
      status: "OPEN",
    },
  });

  return NextResponse.json({ ok: true });
}
