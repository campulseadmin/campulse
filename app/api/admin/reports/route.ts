import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/** GET /api/admin/reports — open/actioned reports in the admin's campus. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const reports = await prisma.report.findMany({
    where: { post: { campusId: admin.campusId } },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { username: true, displayName: true } },
      post: { select: { id: true, body: true, isRemoved: true, authorId: true } },
    },
  });
  return NextResponse.json({ reports });
}

/** POST /api/admin/reports — resolve (dismiss) or action (remove post). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing report id." }, { status: 400 });

  const report = await prisma.report.findUnique({
    where: { id },
    include: { post: { select: { campusId: true } } },
  });
  if (!report || report.post?.campusId !== admin.campusId) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  if (action === "dismiss") {
    await prisma.report.update({ where: { id }, data: { status: "DISMISSED" } });
    return NextResponse.json({ ok: true });
  }
  if (action === "remove") {
    if (report.postId) {
      await prisma.post.update({ where: { id: report.postId }, data: { isRemoved: true } });
    }
    await prisma.report.update({ where: { id }, data: { status: "ACTIONED" } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
