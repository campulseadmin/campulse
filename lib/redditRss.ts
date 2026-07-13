// CamPulse — Reddit ingestion via the PUBLIC RSS feed (no OAuth app required).
//
// WHY RSS, not the OAuth API:
//   Reddit blocks unauthenticated .json (403) and now gates app creation behind
//   the "Responsible Builder Policy". But every subreddit publishes a public RSS
//   feed (r/<sub>/new.rss) that is ToS-compliant to read. This lets the discovery
//   agent pull events WITHOUT a registered app — unblocking the feature today.
//
// RATE LIMITS: Reddit throttles unauthenticated RSS per-IP (429). The agent must
// poll on a SCHEDULE (e.g. every 15-30 min via the cron endpoint), never per-request.

export interface RssPost {
  externalId: string;
  title: string;
  description: string | null;
  link: string;
  pubDate: Date;
  creator: string | null;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

/** Fetch + parse a Reddit subreddit's "new" RSS feed. `subreddit` may be a
 *  subreddit name (r/<name>/new.rss) OR a full RSS URL (used for testing /
 *  self-hosted mirrors). Returns [] on any failure. */
export async function fetchRedditRss(subreddit: string): Promise<RssPost[]> {
  const url = subreddit.startsWith("http")
    ? subreddit
    : `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.rss?limit=25`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "CamPulse/1.0 (campus events discovery agent)" },
      // Don't let a slow Reddit hang the cron job.
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return []; // 429 / 403 / 404 -> graceful, like the OAuth path
    const xml = await r.text();
    const items = xml.split(/<item>/i).slice(1);
    const out: RssPost[] = [];
    for (const it of items) {
      const end = it.indexOf("</item>");
      const block = end >= 0 ? it.slice(0, end) : it;
      const title = pick(block, "title");
      const link = pick(block, "link");
      if (!title || !link) continue;
      const guid = pick(block, "guid") || link;
      const desc = pick(block, "description");
      const pub = pick(block, "pubDate");
      const creator = pick(block, "dc:creator") || pick(block, "author");
      out.push({
        externalId: guid,
        title: title.slice(0, 200),
        description: desc ? stripTags(desc).slice(0, 2000) : null,
        link,
        pubDate: pub ? new Date(pub) : new Date(),
        creator: creator ? creator.slice(0, 120) : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}
