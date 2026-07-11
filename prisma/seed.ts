import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

// Reads a value from env or falls back. Used for the optional admin bootstrap.
function envOrDefault(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
}

async function main() {
  // Campus 1 = SRM
  const srm = await prisma.campus.upsert({
    where: { slug: "srm" },
    update: {},
    create: {
      name: "SRM Institute of Science and Technology",
      shortName: "SRM",
      slug: "srm",
      emailDomain: "srmist.edu.in",
    },
  });

  const communities = [
    { name: "CSE Core", slug: "cse-core", kind: "DEPARTMENT", description: "Computer Science & Engineering — core." },
    { name: "AIML", slug: "aiml", kind: "DEPARTMENT", description: "AI & Machine Learning." },
    { name: "ECE", slug: "ece", kind: "DEPARTMENT", description: "Electronics & Communication." },
    { name: "Mechanical", slug: "mechanical", kind: "DEPARTMENT", description: "Mechanical Engineering." },
    { name: "Hostel", slug: "hostel", kind: "INTEREST", description: "Hostel life, mess, roommates." },
    { name: "Placements", slug: "placements", kind: "INTEREST", description: "Internships, OA experiences, referrals." },
    { name: "Events", slug: "events", kind: "INTEREST", description: "Hackathons, workshops, fests." },
  ] as const;

  for (const c of communities) {
    await prisma.community.upsert({
      where: { campusId_slug: { campusId: srm.id, slug: c.slug } },
      update: {},
      create: { ...c, campusId: srm.id },
    });
  }

  console.log(`Seeded campus "${srm.shortName}" (id=${srm.id}) + ${communities.length} communities.`);

  // ── Optional admin bootstrap (idempotent) ──────────────────────
  // Driven by ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_HANDLE. If unset,
  // a default dev admin is created so the fresh prod DB isn't orphaned.
  // CHANGE THE DEFAULT BEFORE ANY REAL DEPLOY.
  const adminEmail = envOrDefault("ADMIN_EMAIL", "am8269@srmist.edu.in");
  const adminPass = envOrDefault("ADMIN_PASSWORD", "changeme123");
  const adminHandle = envOrDefault("ADMIN_HANDLE", "campulseadmin");
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await hashPassword(adminPass);
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminHandle,
        passwordHash,
        displayName: "CamPulse Admin",
        campusId: srm.id,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
    console.log(`Created admin: ${adminEmail} (handle @${adminHandle}).`);
  } else {
    console.log(`Admin ${adminEmail} already present.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
