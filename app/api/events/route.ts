import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, requireAdmin } from "@/lib/session";
import { ingestAll } from "@/lib/sources";

// GET /api/events?sync=1
// Public-ish: returns APPROVED events for the caller's campus, newest-start first.
// ?sync=1 (admin only) triggers a pull from the campus-owned Reddit/IG handles,
// dedupe-inserts new events (auto-approved), and returns the refreshed list.
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sync = new URL(req.url).searchParams.get("sync") === "1";
  let ingested = { reddit: 0, instagram: 0 };

  if (sync) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
    const { reddit, instagram } = await ingestAll();
    ingested = { reddit: reddit.length, instagram: instagram.length };

    for (const p of [...reddit, ...instagram]) {
      // Dedupe on (sourceType, externalId) before insert.
      const exists = await prisma.event.findFirst({
        where: { sourceType: p.sourceType, externalId: p.externalId },
        select: { id: true },
      });
      if (exists) continue;

      const startsAt = p.startsAt; // event date parsed from the post caption
      await prisma.event.create({
        data: {
          campusId: admin.campusId,
          creatorId: admin.id,
          title: p.title,
          description: p.description,
          location: null,
          startsAt,
          isApproved: true, // owner-authenticated ingest = trusted
          sourceType: p.sourceType,
          sourceHandle: p.sourceHandle,
          sourceUrl: p.sourceUrl,
          externalId: p.externalId,
          imageUrl: p.imageUrl,
        },
      }).catch(() => {}); // swallow unique races
    }
  }

  const events = await prisma.event.findMany({
    where: { campusId: me.campusId, isApproved: true },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { rsvps: true } }, rsvps: { where: { userId: me.id }, select: { id: true } } },
  });

  // Shape to the client contract (rsvpCount + rsvpByMe), independent of _count.
  const shaped = events.map((e) => ({
    ...e,
    rsvpCount: e._count.rsvps,
    rsvpByMe: e.rsvps.length > 0,
    rsvps: undefined,
    _count: undefined,
  }));

  return NextResponse.json({ events: shaped, ingested });
}
