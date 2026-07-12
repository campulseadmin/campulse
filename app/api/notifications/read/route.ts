import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/notifications/read  { id? } — mark one read, or all if no id. */
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
