import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/notifications — list for current user (newest first). */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const items = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { username: true, displayName: true, avatarUrl: true } },
      post: { select: { id: true, body: true } },
    },
  });
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ notifications: items, unread });
}

/** POST /api/notifications/read  { id? } — mark one (or all if no id) as read. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}) as any);
  if (id) {
    await prisma.notification.updateMany({ where: { id, userId: me.id }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
