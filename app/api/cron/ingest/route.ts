import { NextResponse } from "next/server";
import { runDiscoveryAgent } from "@/lib/agent";

// POST /api/cron/ingest
// Runs the Event Discovery Agent. Protected by CRON_SECRET (set in .env).
// Trigger manually from the admin "Event Scout" tab, or schedule it externally:
//   - Vercel Cron: add a cron entry hitting this route
//   - GitHub Action: a scheduled workflow with curl + the secret header
//   - Windows Task Scheduler: a curl task every 15-30 min
// NOT per-request — Reddit throttles unauthenticated RSS, so poll on a schedule.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!secret) {
    // Dev convenience: allow if no secret is configured (local only).
    return NextResponse.json({ error: "CRON_SECRET not set." }, { status: 500 });
  }

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
