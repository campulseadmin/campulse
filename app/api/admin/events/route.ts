import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/** GET /api/admin/events — events in the admin's campus (incl. unapproved). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const events = await prisma.event.findMany({
    where: { campusId: admin.campusId },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { rsvps: true } } },
  });
  return NextResponse.json({ events });
}

/** POST /api/admin/events — create an event (auto-approved by admin). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  const description = b.description ? String(b.description).slice(0, 2000) : null;
  const location = b.location ? String(b.location).slice(0, 200) : null;
  const startsAt = b.startsAt ? new Date(b.startsAt) : null;
  const endsAt = b.endsAt ? new Date(b.endsAt) : null;

  if (!title || !startsAt || isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Title and a valid start time are required." }, { status: 400 });
  }

  const ev = await prisma.event.create({
    data: {
      campusId: admin.campusId,
      creatorId: admin.id,
      title,
      description,
      location,
      startsAt,
      endsAt,
      isApproved: true, // admin-created = pre-approved
    },
  });
  return NextResponse.json({ ok: true, id: ev.id });
}

/** PATCH /api/admin/events — approve a pending event. */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  const ev = await prisma.event.findFirst({ where: { id, campusId: admin.campusId } });
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  if (action === "approve") {
    await prisma.event.update({ where: { id }, data: { isApproved: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
