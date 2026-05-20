import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { handle: "demo" },
    update: {},
    create: {
      name: "Demo Creator",
      handle: "demo",
      plan: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Create a sample product
  await prisma.product.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "sample-guide" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Sample Digital Guide",
      slug: "sample-guide",
      description: "A sample digital product to get started.",
      price: 19.99,
      type: "DIGITAL",
      status: "PUBLISHED",
    },
  });

  console.log({ workspace });
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