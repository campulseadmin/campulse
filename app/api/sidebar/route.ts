import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** GET /api/sidebar — campus-scoped nav data for the persistent app shell. */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const campus = me.campus;
  const communities = await prisma.community.findMany({
    where: { campusId: me.campusId },
    orderBy: { name: "asc" },
    take: 6,
  });
  const trending = await prisma.community.findMany({
    where: { campusId: me.campusId },
    orderBy: { posts: { _count: "desc" } },
    take: 4,
  });
  const postCount = await prisma.post.count({ where: { campusId: me.campusId } });
  const eventCount = await prisma.event.count({ where: { campusId: me.campusId } });

  const name = me.displayName || me.username || me.email.split("@")[0];
  const initial = (me.displayName || me.username || "U").charAt(0).toUpperCase();

  return NextResponse.json({
    me: { username: me.username, displayName: name, initial, role: me.role, avatarUrl: me.avatarUrl },
    campus: { shortName: campus.shortName },
    communities,
    trending,
    postCount,
    eventCount,
  });
}
