import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/avatar  (multipart/form-data, field "file")
 * Validates the image, writes it to public/uploads/avatars/<userId>.<ext>
 * (overwriting any previous photo for this user), and stores the public
 * path on user.avatarUrl. Localhost-first: no external storage.
 */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!EXT[file.type]) {
    return NextResponse.json({ error: "Unsupported type (use PNG/JPG/WEBP/GIF)." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "Empty file." }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 3 MB)." }, { status: 413 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const rel = `/uploads/avatars/${me.id}.${EXT[file.type]}`;
  await writeFile(path.join(dir, `${me.id}.${EXT[file.type]}`), buf);

  await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: rel } });

  return NextResponse.json({ ok: true, avatarUrl: rel });
}

/** DELETE /api/avatar — remove the user's photo, revert to initial avatar. */
export async function DELETE() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true, avatarUrl: null });
}
