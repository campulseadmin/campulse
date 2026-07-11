import crypto from "crypto";
import { prisma } from "./prisma";

const OTP_TTL_MIN = 10;

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "dev";
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

/** Create + store a fresh OTP for an email, returning the plaintext code. */
export async function issueOtp(email: string): Promise<string> {
  const code = generateCode();
  // invalidate previous unconsumed codes
  await prisma.otpCode.updateMany({
    where: { email, consumed: false },
    data: { consumed: true },
  });
  await prisma.otpCode.create({
    data: {
      email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
    },
  });
  return code;
}

/** Verify a submitted code WITHOUT consuming it (for the verify step before account creation). */
export async function checkOtp(email: string, code: string): Promise<boolean> {
  const rec = await prisma.otpCode.findFirst({
    where: { email, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;
  return rec.codeHash === hashCode(code);
}

/** Verify a submitted code; consumes it on success. */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const rec = await prisma.otpCode.findFirst({
    where: { email, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;
  if (rec.codeHash !== hashCode(code)) return false;
  await prisma.otpCode.update({ where: { id: rec.id }, data: { consumed: true } });
  return true;
}
