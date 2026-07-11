import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { AdminPanel } from "./panel";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");
  return <AdminPanel adminName={admin.displayName || admin.username || "Admin"} />;
}
