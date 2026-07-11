// CamPulse — event ingestion from campus-owned social handles.
//
// KEY DESIGN PRINCIPLE (learned from the campusweb.in / SRM-Academia failure):
// CamPulse must NOT silently depend on a fragile external scrape. These sources
// are the CAMPUS-OWNED handles (an official CamPulse Instagram + Reddit account).
// We use each platform's OFFICIAL, owner-authenticated API:
//   - Reddit  : OAuth2 app (reddit.com/prefs/apps), reads YOUR subreddit's /new
//   - Instagram: Graph API via a Business/Creator IG account linked to a FB Page
//
// FAILSAFE: if credentials are missing or a fetch errors, we return [] for that
// source and NEVER throw. The Events feed then shows only seeded/admin events.
// No 403 HTML ever reaches a parser.

export interface IngestedPost {
  sourceType: "REDDIT" | "INSTAGRAM";
  externalId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceHandle: string;
  postedAt: Date;
  startsAt: Date; // the inferred EVENT date (parsed from caption/title)
}

// Parse an event date out of a post caption/title. Looks for explicit
// "when:" / "date:" / "on:" hints, then a set of date formats. Returns null
// if no date can be inferred (the post won't become an event).
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parseEventDate(text: string, fallback: Date): Date | null {
  // Explicit hint like "when: 2026-08-15" or "date: Aug 15"
  const hint = text.match(/(?:when|date|on|on:|date:)\s*[:\-]?\s*([^\n]+)/i);
  const probe = hint ? hint[1] : text;
  const iso = probe.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const [, y, m, d, hh, mm] = iso;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), hh ? Number(hh) : 18, mm ? Number(mm) : 0);
    if (!isNaN(dt.getTime())) return dt;
  }
  const md = probe.match(/\b([A-Za-z]{3,9})\w*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (md) {
    const mon = MONTHS[md[1].slice(0, 3).toLowerCase()];
    if (mon !== undefined) {
      const day = Number(md[2]);
      const year = md[3] ? Number(md[3]) : fallback.getFullYear();
      const dt = new Date(year, mon, day, 18, 0);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  // Numeric "15/08" or "15-08"
  const nd = probe.match(/\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{4}))?\b/);
  if (nd) {
    const day = Number(nd[1]); const mon = Number(nd[2]) - 1;
    const year = nd[3] ? Number(nd[3]) : fallback.getFullYear();
    if (mon >= 0 && mon < 12 && day >= 1 && day <= 31) {
      const dt = new Date(year, mon, day, 18, 0);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

// ── Reddit (official OAuth2) ────────────────────────────────────────────
async function redditToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  try {
    const r = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CamPulse/1.0 (campus events aggregator)",
      },
      body: "grant_type=client_credentials",
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.access_token || null;
  } catch {
    return null;
  }
}

export async function ingestReddit(subreddit: string): Promise<IngestedPost[]> {
  const token = await redditToken();
  if (!token) return [];
  const handle = `r/${subreddit}`;
  try {
    const r = await fetch(`https://oauth.reddit.com/r/${subreddit}/new?limit=25`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "CamPulse/1.0 (campus events aggregator)",
      },
    });
    if (!r.ok) return [];
    const j = await r.json();
    const now = new Date();
    const out: IngestedPost[] = [];
    for (const child of j?.data?.children || []) {
      const d = child?.data;
      if (!d || d.stickied) continue;
      const title = d.title as string;
      const selftext = (d.selftext as string) || "";
      const startsAt = parseEventDate(`${title}\n${selftext}`, now);
      if (!startsAt) continue; // not event-shaped; skip
      out.push({
        sourceType: "REDDIT",
        externalId: d.id,
        title: title.slice(0, 200),
        description: selftext ? selftext.slice(0, 2000) : null,
        imageUrl: (d.thumbnail && d.thumbnail.startsWith("http")) ? d.thumbnail : null,
        sourceUrl: `https://www.reddit.com${d.permalink}`,
        sourceHandle: handle,
        postedAt: new Date(d.created_utc * 1000),
        startsAt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Instagram (Graph API) ───────────────────────────────────────────────
// Requires: Instagram Business/Creator account linked to a FB Page,
// a Meta app, and a long-lived Page access token.
export async function ingestInstagram(): Promise<IngestedPost[]> {
  const igUserId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !token) return [];
  const handle = process.env.IG_HANDLE || "@campulse.srm";
  try {
    const r = await fetch(
      `https://graph.instagram.com/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=25&access_token=${token}`,
    );
    if (!r.ok) return [];
    const j = await r.json();
    const now = new Date();
    const out: IngestedPost[] = [];
    for (const m of j?.data || []) {
      const caption = m.caption as string | null;
      if (!caption) continue;
      const startsAt = parseEventDate(caption, now);
      if (!startsAt) continue;
      out.push({
        sourceType: "INSTAGRAM",
        externalId: m.id,
        title: (caption.split("\n")[0] || "Instagram event").slice(0, 200),
        description: caption.slice(0, 2000),
        imageUrl: m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM" ? m.media_url : null,
        sourceUrl: m.permalink,
        sourceHandle: handle,
        postedAt: new Date(m.timestamp),
        startsAt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Public orchestrator ─────────────────────────────────────────────────
export interface IngestResult {
  reddit: IngestedPost[];
  instagram: IngestedPost[];
  counts: { reddit: number; instagram: number };
}

export async function ingestAll(): Promise<IngestResult> {
  const subreddit = process.env.REDDIT_SUBREDDIT || "";
  const [reddit, instagram] = await Promise.all([
    subreddit ? ingestReddit(subreddit) : Promise.resolve([]),
    ingestInstagram(),
  ]);
  return {
    reddit,
    instagram,
    counts: { reddit: reddit.length, instagram: instagram.length },
  };
}
