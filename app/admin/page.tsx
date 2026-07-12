import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AdminPanel } from "./panel";
import { RequestAccess } from "./request-access";

// Admin portal is fully dynamic (auth + role-gated); never statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const me = await currentUser();
  if (!me) redirect("/login");

  // Not an admin yet: show the request-access flow (separate, non-panel portal).
  if (me.role !== "ADMIN") {
    return <RequestAccess requesterName={me.displayName || me.username || "there"} />;
  }

  const tab =
    searchParams.tab === "reports" || searchParams.tab === "events" || searchParams.tab === "requests"
      ? searchParams.tab
      : "users";

  return <AdminPanel adminName={me.displayName || me.username || "Admin"} initialTab={tab} />;
}
