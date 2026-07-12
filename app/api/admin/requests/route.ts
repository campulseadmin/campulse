import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/**
 * Admin review of admin-access requests.
 * GET  — all requests in the admin's campus (newest first), with requester info.
 * POST — approve (flip role -> ADMIN, mark request APPROVED) or reject
 *        (mark REJECTED). Idempotent on already-reviewed requests.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const requests = await prisma.adminRequest.findMany({
    where: { campusId: admin.campusId },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, username: true, displayName: true, email: true, role: true } },
    },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const reqRecord = await prisma.adminRequest.findFirst({
    where: { id, campusId: admin.campusId },
  });
  if (!reqRecord) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (reqRecord.status !== "PENDING") {
    return NextResponse.json({ error: "Already reviewed.", status: reqRecord.status }, { status: 409 });
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.adminRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date() },
      }),
      prisma.user.update({ where: { id: reqRecord.requesterId }, data: { role: "ADMIN" } }),
    ]);
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  // reject
  await prisma.adminRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedById: admin.id, reviewedAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "REJECTED" });
}
