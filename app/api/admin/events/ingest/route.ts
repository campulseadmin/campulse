import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { extractEvent } from "@/lib/sources";

// POST /api/admin/events/ingest
// Body: { text: string, sourceType?: "REDDIT"|"INSTAGRAM"|"WHATSAPP"|"LINKEDIN"|"PORTAL"|"OTHER", sourceUrl?: string, sourceHandle?: string }
// The event-discovery agent (human-in-the-loop): an admin pastes a post they saw
// on a campus channel; we extract structured fields and land it as a DRAFT
// (isApproved:false) for review in the admin queue. No external API / scraping.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = (body.text || "").toString().trim();
  if (!text) return NextResponse.json({ error: "text is required." }, { status: 400 });

  const sourceType = ["REDDIT", "INSTAGRAM", "WHATSAPP", "LINKEDIN", "PORTAL", "OTHER"].includes(body.sourceType)
    ? body.sourceType
    : "OTHER";
  const sourceUrl = body.sourceUrl ? String(body.sourceUrl).slice(0, 2000) : null;
  const sourceHandle = body.sourceHandle ? String(body.sourceHandle).slice(0, 120) : null;

  const ex = extractEvent(text);
  if (!ex.startsAt) {
    return NextResponse.json(
      { error: "Couldn't find a date in the text. Add a date (e.g. 'Aug 15' or '2026-08-15') so it can become an event." },
      { status: 422 },
    );
  }

  const ev = await prisma.event.create({
    data: {
      campusId: admin.campusId,
      creatorId: admin.id,
      title: ex.title || "Untitled event",
      description: ex.description,
      location: ex.location,
      startsAt: ex.startsAt,
      isApproved: false, // DRAFT — admin reviews before public
      sourceType,
      sourceHandle,
      sourceUrl,
      externalId: null, // manual paste, not a platform post id
      registrationUrl: ex.registrationUrl,
      foundAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, id: ev.id, draft: ex });
}
