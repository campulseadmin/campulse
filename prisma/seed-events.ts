// CamPulse — seed curated SRM events from KNOWN campus club/subreddit handles.
//
// Owner-curated content (not scraped): a realistic SRM event calendar attributed
// to real clubs so the Events feed is populated and useful on day one. When the
// official CamPulse IG/Reddit handles go live, the admin "Sync handles" button
// ingests those posts on top of these. sourceType = SEED keeps them distinct.
//
// Dates are RELATIVE (inDays from "today") so the feed is always upcoming.
//
// Run: npm run db:seed-events   (after db:push)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Build a Date n days from now at a given time.
function inDays(days: number, hour = 18, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
}

const SRM_EVENTS = [
  // ── Flagship fests ──────────────────────────────────────────────
  {
    title: "Aaruush 2026 — National Level Techno-Management Fest",
    description: "SRM's flagship annual techno-management fest. 50+ events across tech, management, gaming and culture. 3 days of competitions, workshops and pro-shows.\nwhen: 2026-09-18\n📍 University Green Field, Kattankulathur",
    location: "University Green Field, Kattankulathur",
    startsAt: inDays(69, 10, 0),
    sourceHandle: "@aaruush.srm",
    externalId: "seed-aaruush-2026",
  },
  {
    title: "Milan — The Cultural Fest of SRM",
    description: "Milan is SRM's grand cultural extravaganza — dance, music, dramatics, fashion and battle of bands.\nwhen: 2026-10-02\n📍 Open Air Theatre (OAT)",
    location: "Open Air Theatre (OAT), SRM",
    startsAt: inDays(83, 17, 0),
    sourceHandle: "@milan.srmist",
    externalId: "seed-milan-2026",
  },
  {
    title: "Spardha — Inter-College Sports Fest",
    description: "SRM's annual sports meet: cricket, football, basketball, athletics, badminton and more. Inter-department and open categories.\nwhen: 2026-11-12\n📍 SRM Sports Complex",
    location: "SRM Sports Complex",
    startsAt: inDays(124, 8, 0),
    sourceHandle: "@spardha.srm",
    externalId: "seed-spardha-2026",
  },
  {
    title: "TEDxSRMIST — Ideas Worth Spreading",
    description: "Independent TEDx event on campus. Speakers from academia, industry and the arts. Limited seats, registrations open.\nwhen: 2026-09-27\n📍 TP Ganesan Auditorium",
    location: "TP Ganesan Auditorium",
    startsAt: inDays(78, 15, 0),
    sourceHandle: "@tedxsrmist",
    externalId: "seed-tedx-2026",
  },

  // ── Tech clubs & departments ────────────────────────────────────
  {
    title: "CSI SRM — Full Stack Web Dev Bootcamp",
    description: "Two-day hands-on bootcamp: Next.js + Prisma + Postgres. Build and deploy a real app. Limited seats.\nwhen: 2026-08-09\n📍 CSE Lab Block 3",
    location: "CSE Lab, Block 3",
    startsAt: inDays(29, 9, 30),
    sourceHandle: "r/SRMKTR",
    externalId: "seed-csi-bootcamp",
  },
  {
    title: "AIML Department — GenAI Hackathon 2026",
    description: "24-hour hackathon on generative AI. Build agents, RAG apps or multimodal tools. Mentors from industry.\nwhen: 2026-08-22\n📍 Innovation Centre",
    location: "Innovation Centre, SRM",
    startsAt: inDays(42, 10, 0),
    sourceHandle: "@srm_aiml",
    externalId: "seed-aiml-hack",
  },
  {
    title: "ECE Association — Circuit Design Challenge",
    description: "Solder and ship a working circuit in 6 hours. Components provided. Prizes for top 3 teams.\nwhen: 2026-09-05\n📍 ECE Labs, Block 1",
    location: "ECE Labs, Block 1",
    startsAt: inDays(56, 14, 0),
    sourceHandle: "@srm_ece",
    externalId: "seed-ece-circuit",
  },
  {
    title: "Coding Club — CodeChef SnackDown Campus Qualifiers",
    description: "On-campus qualifier for SnackDown. 3-hour ICPC-style contest. Rated, with goodies.\nwhen: 2026-08-16\n📍 Computer Centre",
    location: "Computer Centre, SRM",
    startsAt: inDays(36, 19, 0),
    sourceHandle: "r/SRMKTR",
    externalId: "seed-snackdown",
  },
  {
    title: "IEEE SRM — IoT & Embedded Systems Workshop",
    description: "Weekend workshop on ESP32, sensors and MQTT. Take home your first connected device.\nwhen: 2026-08-29\n📍 Embedded Systems Lab",
    location: "Embedded Systems Lab, Block 2",
    startsAt: inDays(49, 10, 0),
    sourceHandle: "@ieee_srm",
    externalId: "seed-ieee-iot",
  },
  {
    title: "GDG SRM — Build with Firebase & Gemini",
    description: "DevFest-style session: ship a Flutter app backed by Firebase + Gemini. Bring a laptop.\nwhen: 2026-09-13\n📍 Tech Park Seminar Hall",
    location: "Tech Park Seminar Hall",
    startsAt: inDays(64, 16, 0),
    sourceHandle: "@gdg_srm",
    externalId: "seed-gdg-firebase",
  },
  {
    title: "HackSRM — 36-Hour Open Hackathon",
    description: "The campus's biggest student-run hackathon. Open to all years. Track prizes, mentors, and a midnight magic show.\nwhen: 2026-10-17\n📍 University Building, Floor 1",
    location: "University Building, SRM",
    startsAt: inDays(98, 9, 0),
    sourceHandle: "@hacksrm",
    externalId: "seed-hacksrm-2026",
  },

  // ── Cultural & language societies ───────────────────────────────
  {
    title: "Tamil Mandram — Kavithai Night & Pattimandram",
    description: "An evening of Tamil poetry, oratory and light music by Tamil Mandram. Open to all SRM students.\nwhen: 2026-08-15\n📍 TP Ganesan Auditorium",
    location: "TP Ganesan Auditorium",
    startsAt: inDays(35, 18, 30),
    sourceHandle: "@tamilmandram_srm",
    externalId: "seed-tamil-mandram-aug",
  },
  {
    title: "Rhapsody — Western Music Auditions",
    description: "Open auditions for the campus band. Vocals, guitar, keys, drums. No experience needed to try.\nwhen: 2026-08-11\n📍 Music Room, Student Activity Centre",
    location: "Student Activity Centre",
    startsAt: inDays(31, 17, 0),
    sourceHandle: "@rhapsody.srm",
    externalId: "seed-rhapsody-auditions",
  },
  {
    title: "Lensfield — Photography Walk & Contest",
    description: "Golden-hour photo walk around campus followed by a themed contest. Cameras/phones welcome.\nwhen: 2026-08-23\n📍 Meet at University Square",
    location: "University Square, SRM",
    startsAt: inDays(43, 16, 30),
    sourceHandle: "@lensfield.srm",
    externalId: "seed-lensfield-walk",
  },

  // ── Entrepreneurship & outreach ─────────────────────────────────
  {
    title: "Entrepreneurship Cell — E-Summit Pitch Night",
    description: "Student startups pitch to a panel of founders and VCs. Open audience, networking after.\nwhen: 2026-09-12\n📍 University Guest House Hall",
    location: "University Guest House Hall",
    startsAt: inDays(63, 17, 30),
    sourceHandle: "@ecell_srm",
    externalId: "seed-esummit",
  },
  {
    title: "NSS SRM — Rural Outreach Drive",
    description: "Weekend outreach to nearby villages: digital literacy, health camp and tree plantation. Volunteer credits awarded.\nwhen: 2026-08-30\n📍 Assembly at Main Gate",
    location: "SRM Main Gate",
    startsAt: inDays(50, 7, 30),
    sourceHandle: "@nss_srm",
    externalId: "seed-nss-outreach",
  },
];

async function main() {
  const srm = await prisma.campus.findUnique({ where: { slug: "srm" } });
  if (!srm) {
    console.error('❌ Campus "srm" not found. Run `npm run db:seed` first.');
    process.exit(1);
  }

  // Find an admin to attribute seeds to (creator is required by the schema).
  const admin = await prisma.user.findFirst({ where: { campusId: srm.id, role: "ADMIN" } });
  if (!admin) {
    console.error("❌ No ADMIN user found in campus. Create one before seeding events.");
    process.exit(1);
  }

  let added = 0;
  for (const e of SRM_EVENTS) {
    const exists = await prisma.event.findFirst({
      where: { sourceType: "SEED", externalId: e.externalId },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.event.create({
      data: {
        campusId: srm.id,
        creatorId: admin.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.startsAt,
        isApproved: true,
        sourceType: "SEED",
        sourceHandle: e.sourceHandle,
        externalId: e.externalId,
      },
    });
    added++;
  }

  console.log(`✓ Seeded ${added} new SRM events (${SRM_EVENTS.length - added} already present, total ${SRM_EVENTS.length}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
