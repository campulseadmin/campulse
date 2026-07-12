import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** POST /api/notifications/read  { id } — mark a single notification read. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}) as any);
  if (!id) return NextResponse.json({ error: "Notification id required." }, { status: 400 });
  await prisma.notification.updateMany({ where: { id, userId: me.id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
