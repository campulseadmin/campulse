import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// GET /api/admin/resources — pending approval queue for the admin's campus.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const pending = await prisma.resource.findMany({
    where: { campusId: admin.campusId, approved: false },
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: { displayName: true, username: true } } },
  });
  return NextResponse.json({ pending });
}

// POST /api/admin/resources — { id, action: "approve" | "reject" }
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action(approve|reject) required." }, { status: 400 });
  }

  const target = await prisma.resource.findFirst({
    where: { id, campusId: admin.campusId },
  });
  if (!target) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  if (action === "reject") {
    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // approve
  await prisma.resource.update({
    where: { id },
    data: { approved: true, approvedById: admin.id },
  });
  return NextResponse.json({ ok: true, action: "approved" });
}
