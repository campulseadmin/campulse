import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

// POST /api/events/[id]/rsvp  — toggle "going" for the current user.
// Body optional: { going: true|false }. No body = toggle.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ev = await prisma.event.findFirst({
    where: { id: params.id, campusId: me.campusId, isApproved: true },
  });
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const want = typeof b.going === "boolean" ? b.going : null;

  const existing = await prisma.rsvp.findUnique({
    where: { eventId_userId: { eventId: ev.id, userId: me.id } },
  });

  let going: boolean;
  if (want === false && existing) {
    await prisma.rsvp.delete({ where: { id: existing.id } });
    going = false;
  } else if (want === true && !existing) {
    await prisma.rsvp.create({ data: { eventId: ev.id, userId: me.id } });
    going = true;
  } else if (want === null) {
    if (existing) {
      await prisma.rsvp.delete({ where: { id: existing.id } });
      going = false;
    } else {
      await prisma.rsvp.create({ data: { eventId: ev.id, userId: me.id } });
      going = true;
    }
  } else {
    going = !!existing; // no-op
  }

  const count = await prisma.rsvp.count({ where: { eventId: ev.id } });
  return NextResponse.json({ going, count });
}
