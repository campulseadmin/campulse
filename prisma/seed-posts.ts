// CamPulse — seed demo student voices so a fresh localhost feed isn't empty.
//
// Idempotent demo content: a handful of realistic SRM student posts attributed
// to a few seeded demo users (all in campus 1 = SRM). Skips if any demo post
// already exists (matched by a stable marker in the body). Safe to re-run.
//
// Run: npm run db:seed-posts   (after db:seed)

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

function envOrDefault(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
}

const DEMO_PASSWORD = envOrDefault("DEMO_PASSWORD", "demo1234");

const DEMO_USERS = [
  { username: "aarav.cse", displayName: "Aarav", dept: "CSE", batch: "2024-2028", bio: "CSE sophomore. Building things at CSI SRM." },
  { username: "meera.aiml", displayName: "Meera", dept: "AIML", batch: "2023-2027", bio: "GenAI, hackathons, badminton." },
  { username: "karthik.ece", displayName: "Karthik", dept: "ECE", batch: "2024-2028", bio: "Circuits > calculus. ECE '28." },
  { username: "sara.design", displayName: "Sara", dept: "CSE", batch: "2023-2027", bio: "Design lead, Rhapsody. Tamil Mandram." },
];

const DEMO_POSTS = [
  "Anyone else hyped for HackSRM this year? 36 hours, open to all years — forming a team for the health-tech track. DM @aarav.cse if you're in. 🚀",
  "Just shipped my first Next.js + Prisma app for the CSI bootcamp. The campus_id multi-tenant model finally clicked for me. Happy to share notes. #buildinpublic",
  "GenAI Hackathon at the Innovation Centre — 24h, mentors from industry. If you've never trained an agent before, this is the one to show up for. @meera.aiml",
  "Circuit Design Challenge this Saturday, ECE Labs Block 1. Solder a working circuit in 6 hours, prizes for top 3. Bring your own screwdriver 😄 @karthik.ece",
  "Kavithai Night by Tamil Mandram was unreal last night. Poetry, oratory, light music — if you missed it, the next one is in October. Open to all. @sara.design",
  "PSA: CodeChef SnackDown campus qualifiers are on 16 Aug at the Computer Centre. 3-hour ICPC-style contest, rated, with goodies. Register on the Coding Club portal.",
  "Genuine question — how are people managing placement prep alongside clubs? Feel like I'm dropping one ball no matter what. What's your system?",
  "Rhapsody auditions were packed today. So much talent on this campus it's wild. Can't wait for the fest season to kick off 🎶",
];

async function main() {
  const srm = await prisma.campus.findUnique({ where: { slug: "srm" } });
  if (!srm) {
    console.error('❌ Campus "srm" not found. Run `npm run db:seed` first.');
    process.exit(1);
  }

  const created: string[] = [];
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: `${u.username}@srmist.edu.in`,
          username: u.username,
          passwordHash: await hashPassword(DEMO_PASSWORD),
          displayName: u.displayName,
          dept: u.dept,
          batch: u.batch,
          bio: u.bio,
          campusId: srm.id,
          role: "STUDENT",
          emailVerified: new Date(),
        },
      });
      created.push(u.username);
    }
  }
  if (created.length) console.log(`Created ${created.length} demo users.`);

  const users = await prisma.user.findMany({
    where: { username: { in: DEMO_USERS.map((u) => u.username) } },
    orderBy: { username: "asc" },
  });
  if (users.length < 2) {
    console.error("❌ Need at least 2 demo users to seed posts.");
    process.exit(1);
  }

  let added = 0;
  for (let i = 0; i < DEMO_POSTS.length; i++) {
    const marker = `<!-- demo:${i} -->`;
    const exists = await prisma.post.findFirst({
      where: { campusId: srm.id, body: { contains: marker } },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.post.create({
      data: {
        campusId: srm.id,
        authorId: users[i % users.length].id,
        body: `${DEMO_POSTS[i]}\n${marker}`,
      },
    });
    added++;
  }
  console.log(`✓ Seeded ${added} demo posts (${DEMO_POSTS.length - added} already present).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
