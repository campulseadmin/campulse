import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <BrandLogo height={48} priority />
      <p className="mt-4 text-lg" style={{ color: "var(--muted)" }}>
        The pulse of your campus. Everything, in one place.
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Feed · Communities · Events · Verified students only.
      </p>
      <Link href="/login" className="btn mt-8 inline-block">
        Get started with your campus email
      </Link>
      <p className="mt-6 text-xs" style={{ color: "var(--muted)" }}>
        Currently live at SRM. More campuses coming.
      </p>
    </main>
  );
}
