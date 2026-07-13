// CamPulse — the Event Discovery Agent.
//
// Scheduled job (not per-request): pulls from configured campus sources, extracts
// event-shaped posts, and lands them as DRAFT events for admin review. The human
// stays in the loop ONLY for approval (quality / spam control), not collection.
//
// Sources today:
//   - Reddit  : public RSS (lib/redditRss) — no app/creds needed
//   - Instagram: Graph API (lib/sources.ingestInstagram) — needs Business IG + token
//
// Designed to be called by /api/cron/ingest (manual button OR external cron:
// Vercel Cron / GitHub Action / Windows Task Scheduler). Never scrapes; only reads
// official, owner-authenticated, or public feeds.

import { prisma } from "@/lib/prisma";
import { extractEvent, ingestInstagram } from "@/lib/sources";
import { fetchRedditRss } from "@/lib/redditRss";

export interface AgentRunResult {
  reddit: number;
  instagram: number;
  drafts: number;
  errors: string[];
  ranAt: string;
}

/**
 * Run the discovery agent for ALL campuses. For Reddit we use the public RSS feed
 * of REDDIT_SUBREDDIT; for Instagram the Graph API if IG_* env are set.
 * Each extracted event becomes a DRAFT (isApproved:false) awaiting admin approval.
 */
export async function runDiscoveryAgent(): Promise<AgentRunResult> {
  const errors: string[] = [];
  let drafts = 0;

  // Resolve a creator ONCE (lookup outside the loop — avoids N+1 queries).
  // If no admin exists the draft can't be attributed, so we record an error
  // instead of creating an orphaned/invalid event.
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) {
    errors.push("no ADMIN user found — cannot attribute drafted events");
    return { reddit: 0, instagram: 0, drafts: 0, errors, ranAt: new Date().toISOString() };
  }
  const creatorId = admin.id;

  // One subreddit is configured app-wide via env (kept simple; per-campus later).
  const subreddit = process.env.REDDIT_SUBREDDIT || "";
  const redditPosts = subreddit ? await fetchRedditRss(subreddit) : [];
  let redditEvents = 0;

  for (const p of redditPosts) {
    const ex = extractEvent(`${p.title}\n${p.description || ""}`);
    if (!ex.startsAt) continue; // not event-shaped -> skip (no date)
    redditEvents++;

    // Dedupe on (sourceType, sourceUrl/link) so re-runs don't duplicate.
    const dup = await prisma.event.findFirst({
      where: { sourceType: "REDDIT", sourceUrl: p.link },
      select: { id: true },
    });
    if (dup) continue;

    const created = await prisma.event.create({
      data: {
        // Campus: attach to the first campus (SRM=1) for now; multi-tenant later.
        campusId: 1,
        creatorId,
        title: ex.title || p.title,
        description: ex.description,
        location: ex.location,
        startsAt: ex.startsAt,
        isApproved: false, // DRAFT
        sourceType: "REDDIT",
        sourceHandle: p.creator ? `u/${p.creator}` : `r/${subreddit}`,
        sourceUrl: p.link,
        externalId: p.externalId,
        registrationUrl: ex.registrationUrl,
        foundAt: new Date(),
      },
    }).catch(() => null);
    if (created) drafts++; // only count if the write actually succeeded
  }

  // Instagram (Graph API) — only if configured.
  let igEvents = 0;
  try {
    const ig = await ingestInstagram();
    for (const p of ig) {
      const dup = await prisma.event.findFirst({
        where: { sourceType: "INSTAGRAM", externalId: p.externalId },
        select: { id: true },
      });
      if (dup) continue;
      const created = await prisma.event.create({
        data: {
          campusId: 1,
          creatorId,
          title: p.title,
          description: p.description,
          location: null,
          startsAt: p.startsAt,
          isApproved: false,
          sourceType: "INSTAGRAM",
          sourceHandle: p.sourceHandle,
          sourceUrl: p.sourceUrl,
          externalId: p.externalId,
          imageUrl: p.imageUrl,
          registrationUrl: p.registrationUrl ?? null,
          foundAt: new Date(),
        },
      }).catch(() => null);
      if (created) drafts++;
      igEvents++;
    }
  } catch (e) {
    errors.push("instagram: " + (e instanceof Error ? e.message : "failed"));
  }

  return {
    reddit: redditEvents,
    instagram: igEvents,
    drafts,
    errors,
    ranAt: new Date().toISOString(),
  };
}
