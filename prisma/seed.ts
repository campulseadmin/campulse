import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
