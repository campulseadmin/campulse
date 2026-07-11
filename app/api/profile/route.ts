import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin", "campulse", "root", "support", "help", "mod", "moderator",
  "official", "api", "login", "signup", "dashboard", "onboarding", "verify",
  "profile", "u", "null", "undefined",
]);
const HANDLE_COOLDOWN_DAYS = 14;

/** GET /api/profile?u=@handle — public profile + that user's posts. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = String(url.searchParams.get("u") || "")
    .trim().toLowerCase().replace(/^@/, "");
  if (!handle) {
    return NextResponse.json({ error: "Missing handle." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { username: handle, isBanned: false },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      dept: true,
      batch: true,
      campus: { select: { shortName: true } },
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, isRemoved: false },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      community: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({
    user: {
      ...user,
      campusShort: user.campus.shortName,
      postCount: user._count.posts,
    },
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author,
      community: p.community,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: false,
    })),
  });
}
