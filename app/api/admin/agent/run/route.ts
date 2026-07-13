import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { runDiscoveryAgent } from "@/lib/agent";

// POST /api/admin/agent/run
// Admin-triggered discovery agent run (the "Run discovery agent" button in the
// Event Scout tab). Guarded by the NextAuth admin session — no shared secret in
// the browser. External schedulers should use /api/cron/ingest (CRON_SECRET).
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  try {
    const result = await runDiscoveryAgent();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "agent failed" },
      { status: 500 },
    );
  }
}
