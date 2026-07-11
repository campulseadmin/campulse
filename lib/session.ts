import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/** Resolve the current signed-in, onboarded user (with campus). Null if not. */
export async function currentUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { campus: true },
  });
  if (!user || user.isBanned) return null;
  return user;
}

/** Resolve the current user only if they hold the ADMIN role. Null otherwise. */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
