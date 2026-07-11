import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Feed } from "./feed";
import { AppShell } from "@/components/AppShell";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { campus: true } })
    : null;
  if (!user) redirect("/login");

  // Onboarding gate: not verified or no handle yet → finish setup first.
  if (!user.emailVerified) redirect("/verify");
  if (!user.username) redirect("/onboarding");

  return (
    <AppShell active="home">
      <div className="tw-header px-4 py-3">
        <div className="text-xl font-bold">Home</div>
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>
          {user.campus.shortName} · {user.username}
        </div>
      </div>
      <Feed />
    </AppShell>
  );
}
