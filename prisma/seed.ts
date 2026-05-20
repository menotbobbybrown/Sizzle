import { PrismaClient, SaaSPlan } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Creator",
      slug: "demo",
      plan: SaaSPlan.FREE,
    },
  });

  console.log({ tenant });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
