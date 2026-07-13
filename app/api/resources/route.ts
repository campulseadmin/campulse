import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const TYPES = new Set(["NOTE", "PYQ", "MATERIAL"]);

// GET /api/resources?dept=CSE&semester=3&type=PYQ
// Public: only APPROVED resources for the caller's campus.
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const where: any = { campusId: me.campusId, approved: true };
  const dept = q.get("dept");
  const type = q.get("type");
  const sem = q.get("semester");
  if (dept) where.dept = dept.toUpperCase();
  if (type && TYPES.has(type.toUpperCase())) where.type = type.toUpperCase();
  if (sem && /^\d+$/.test(sem)) where.semester = parseInt(sem, 10);

  // Token search (Phase 4b — discovery, no LLM). Split the query into words,
  // OR-match each token across searchable fields, then rank by match count so
  // the closest hit surfaces first. e.g. "OOPS Unit 3 notes" -> ranked results.
  const rawQuery = q.get("q");
  let rank = false;
  if (rawQuery) {
    const tokens = rawQuery
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length) {
      rank = true;
      where.OR = tokens.map((t) => ({
        OR: [
          { title: { contains: t } },
          { description: { contains: t } },
          { dept: { contains: t.toUpperCase() } },
          { type: { contains: t.toUpperCase() } },
          { semester: { equals: parseInt(t, 10) || undefined } },
        ],
      }));
    }
  }

  const rows = await prisma.resource.findMany({
    where,
    orderBy: rank ? undefined : { createdAt: "desc" },
    take: 100,
    include: { uploadedBy: { select: { displayName: true, username: true } } },
  });

  // Rank: count how many query tokens appear in the searchable text.
  let resources = rows;
  if (rank && rawQuery) {
    const tokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
    resources = rows
      .map((r) => {
        const hay = `${r.title} ${r.description || ""} ${r.dept || ""} ${r.type} ${r.semester ?? ""}`.toLowerCase();
        const score = tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
        return { ...r, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }

  return NextResponse.json({ resources });
}

// POST /api/resources — any signed-in user submits. Lands in the approval queue.
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, type, dept, semester, driveUrl, description } = body;
  if (!title || !driveUrl) {
    return NextResponse.json({ error: "title and driveUrl are required." }, { status: 400 });
  }
  if (type && !TYPES.has(String(type).toUpperCase())) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  const url = String(driveUrl);
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "driveUrl must be a valid link." }, { status: 400 });
  }
  // semester must be a clean 1..8 integer, or omitted. Don't coerce garbage to 1.
  let sem: number | null = null;
  if (semester !== undefined && semester !== null && semester !== "") {
    const n = parseInt(String(semester), 10);
    if (!Number.isInteger(n) || n < 1 || n > 8) {
      return NextResponse.json({ error: "semester must be 1–8." }, { status: 400 });
    }
    sem = n;
  }

  const resource = await prisma.resource.create({
    data: {
      campusId: me.campusId,
      uploadedById: me.id,
      title: String(title).slice(0, 200),
      type: String(type || "NOTE").toUpperCase(),
      dept: dept ? String(dept).toUpperCase().slice(0, 20) : null,
      semester: sem,
      driveUrl: url.slice(0, 500),
      description: description ? String(description).slice(0, 500) : null,
      approved: false, // admin approves before public
    },
  });

  return NextResponse.json({ resource, status: "pending_approval" }, { status: 201 });
}
