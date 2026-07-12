import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const ROLES = new Set(["STUDENT", "MODERATOR", "ADMIN"]);

/** GET /api/admin/users — all users in the admin's campus. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { campusId: admin.campusId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, username: true, displayName: true, email: true,
      role: true, isBanned: true, emailVerified: true, createdAt: true,
      _count: { select: { posts: true } },
    },
  });
  return NextResponse.json({ users });
}

/** POST /api/admin/users — ban/unban or change role. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id, action, role } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (id === admin.id) {
    return NextResponse.json({ error: "You can't moderate yourself." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, campusId: admin.campusId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (action === "ban") {
    await prisma.user.update({ where: { id }, data: { isBanned: true, bannedUntil: null } });
    return NextResponse.json({ ok: true });
  }
  if (action === "unban") {
    await prisma.user.update({ where: { id }, data: { isBanned: false } });
    return NextResponse.json({ ok: true });
  }
  if (action === "role") {
    if (role === "ADMIN") {
      // Admin access is approval-gated: promo to ADMIN only via /api/admin/requests.
      return NextResponse.json(
        { error: "Admin access must be approved via an admin request." },
        { status: 400 }
      );
    }
    if (!ROLES.has(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    await prisma.user.update({ where: { id }, data: { role } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
