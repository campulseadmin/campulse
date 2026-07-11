import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { emailDomain } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  const clean = String(email || "").trim().toLowerCase();

  if (!clean || !clean.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Gate to a registered campus by email domain.
  const campus = await prisma.campus.findFirst({
    where: { emailDomain: emailDomain(clean) },
  });
  if (!campus) {
    return NextResponse.json(
      { error: "This email domain isn't a registered campus yet." },
      { status: 403 }
    );
  }

  const { devCode, previewUrl } = await sendOtpEmail(clean);
  return NextResponse.json({ ok: true, campus: campus.shortName, devCode, previewUrl });
}
