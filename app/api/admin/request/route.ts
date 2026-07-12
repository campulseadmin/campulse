import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/**
 * Self-service admin access request.
 * GET  — return the caller's latest request + whether they're already an admin.
 * POST — file a new PENDING request (one open request per user). Already-admins
 *       and already-pending users are rejected.
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const latest = await prisma.adminRequest.findFirst({
    where: { requesterId: me.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ isAdmin: me.role === "ADMIN", request: latest || null });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (me.role === "ADMIN") {
    return NextResponse.json({ error: "You're already an admin." }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const reason = b.reason ? String(b.reason).slice(0, 500) : null;

  const open = await prisma.adminRequest.findFirst({
    where: { requesterId: me.id, status: "PENDING" },
  });
  if (open) return NextResponse.json({ error: "You already have a pending request.", status: "PENDING" }, { status: 409 });

  const created = await prisma.adminRequest.create({
    data: { campusId: me.campusId, requesterId: me.id, reason },
  });
  return NextResponse.json({ ok: true, request: created });
}
