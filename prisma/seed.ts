import { PrismaClient } from "@prisma/client";
import { hashToken } from "../src/lib/tokens";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.emailEvent.deleteMany();
  await prisma.campaignSend.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.muxAsset.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.discountCode.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.analyticsDaily.deleteMany();
  await prisma.aiGenerationLog.deleteMany();
  await prisma.themeVersion.deleteMany();
  await prisma.storefrontTheme.deleteMany();
  await prisma.product.deleteMany();
  await prisma.handleReservation.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.onboardingState.deleteMany();

  // Create demo workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Alex Rivera",
      handle: "alexrivera",
      bio: "Digital creator specializing in productivity courses and digital downloads. I help people level up their skills and build better habits.",
      logoUrl: null,
      bannerUrl: null,
      stripeAccountId: null, // Will be set when creator connects Stripe
      stripeAccountStatus: "disconnected",
      plan: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  console.log(`✅ Created workspace: @${workspace.handle}`);

  // Create demo products
  const courseProduct = await prisma.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Master Productivity in 30 Days",
      slug: "master-productivity-30-days",
      description: "A comprehensive course to transform your daily habits and boost your productivity. Learn to manage your time, focus better, and achieve more.",
      price: 49.99,
      currency: "USD",
      type: "COURSE",
      status: "PUBLISHED",
      imageUrl: null,
    },
  });

  // Create course structure
  const course = await prisma.course.create({
    data: { productId: courseProduct.id },
  });

  // Create modules and lessons
  const modules = [
    {
      title: "Week 1: Foundations",
      lessons: [
        { title: "Understanding Your Current State", content: "Let's start by analyzing your current habits and identifying areas for improvement.", lessonType: "TEXT" as const },
        { title: "Setting Clear Goals", content: "Learn how to set SMART goals that actually drive results.", lessonType: "TEXT" as const },
        { title: "Time Audit Deep Dive", content: "Discover where your time goes and how to reclaim it.", lessonType: "VIDEO" as const },
      ],
    },
    {
      title: "Week 2: Building Systems",
      lessons: [
        { title: "Creating Your Morning Routine", content: "Design a morning routine that sets you up for success.", lessonType: "TEXT" as const },
        { title: "Task Management 101", content: "Learn the fundamentals of effective task management.", lessonType: "TEXT" as const },
        { title: "Weekly Review Process", content: "Implement a weekly review that keeps you on track.", lessonType: "VIDEO" as const },
      ],
    },
    {
      title: "Week 3: Advanced Techniques",
      lessons: [
        { title: "Deep Work Strategies", content: "Master the art of focused, distraction-free work.", lessonType: "TEXT" as const },
        { title: "Managing Energy, Not Just Time", content: "Understand how to work with your natural energy cycles.", lessonType: "TEXT" as const },
        { title: "Batching and Automation", content: "Learn to batch tasks and automate repetitive work.", lessonType: "VIDEO" as const },
      ],
    },
    {
      title: "Week 4: Maintaining Growth",
      lessons: [
        { title: "Building Sustainable Habits", content: "Create habits that stick for the long term.", lessonType: "TEXT" as const },
        { title: "Dealing with Setbacks", content: "What to do when things don't go as planned.", lessonType: "TEXT" as const },
        { title: "Course Wrap-up", content: "Final thoughts and next steps for your productivity journey.", lessonType: "VIDEO" as const },
      ],
    },
  ];

  for (let i = 0; i < modules.length; i++) {
    const module = await prisma.courseModule.create({
      data: {
        courseId: course.id,
        title: modules[i].title,
        order: i,
      },
    });

    for (let j = 0; j < modules[i].lessons.length; j++) {
      await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: modules[i].lessons[j].title,
          content: modules[i].lessons[j].content,
          lessonType: modules[i].lessons[j].lessonType,
          order: j,
        },
      });
    }
  }

  console.log(`✅ Created course: ${courseProduct.name}`);

  // Create digital product
  const ebookProduct = await prisma.product.create({
    data: {
      workspaceId: workspace.id,
      name: "The Productivity Playbook",
      slug: "productivity-playbook-pdf",
      description: "A 150-page PDF guide with actionable strategies, worksheets, and templates to boost your productivity immediately.",
      price: 19.99,
      currency: "USD",
      type: "DIGITAL",
      status: "PUBLISHED",
      imageUrl: null,
    },
  });

  console.log(`✅ Created digital product: ${ebookProduct.name}`);

  // Create freebie
  const freebieProduct = await prisma.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Daily Planner Template",
      slug: "daily-planner-template",
      description: "A beautifully designed daily planner template for Notion, Google Sheets, or printable use.",
      price: 0,
      currency: "USD",
      type: "FREEBIE",
      status: "PUBLISHED",
      imageUrl: null,
    },
  });

  console.log(`✅ Created freebie: ${freebieProduct.name}`);

  // Create a sample order (simulated - no actual Stripe payment)
  const sampleOrder = await prisma.order.create({
    data: {
      workspaceId: workspace.id,
      userId: null, // Anonymous purchase
      customerEmail: "customer@example.com",
      customerName: "Sarah Johnson",
      amount: 49.99,
      currency: "USD",
      status: "PAID",
      stripeSessionId: "cs_test_demo_" + Date.now(),
      stripePaymentIntentId: "pi_demo_" + Date.now(),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: sampleOrder.id,
      productId: courseProduct.id,
      quantity: 1,
      unitPrice: 49.99,
    },
  });

  // Create access token for the order
  const rawToken = hashToken("demo-token-" + Date.now());
  await prisma.accessToken.create({
    data: {
      tokenHash: rawToken,
      orderId: sampleOrder.id,
      productId: courseProduct.id,
      maxUses: 5,
      useCount: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await prisma.payment.create({
    data: {
      orderId: sampleOrder.id,
      stripePaymentIntentId: sampleOrder.stripePaymentIntentId!,
      stripeSessionId: sampleOrder.stripeSessionId!,
      amount: 49.99,
      currency: "USD",
      status: "SUCCEEDED",
    },
  });

  console.log(`✅ Created sample order: ${sampleOrder.id}`);

  // Create discount codes
  await prisma.discountCode.create({
    data: {
      workspaceId: workspace.id,
      code: "EARLYBIRD",
      type: "PERCENTAGE",
      value: 20,
      maxUses: 100,
      usedCount: 5,
      isActive: true,
    },
  });

  await prisma.discountCode.create({
    data: {
      workspaceId: workspace.id,
      code: "LAUNCH50",
      type: "FIXED",
      value: 10,
      maxUses: 50,
      usedCount: 12,
      isActive: true,
    },
  });

  console.log(`✅ Created discount codes: EARLYBIRD (20% off), LAUNCH50 ($10 off)`);

  // Create sample subscribers
  const subscribers = [
    { email: "alice@example.com", name: "Alice Chen" },
    { email: "bob@example.com", name: "Bob Martinez" },
    { email: "carol@example.com", name: "Carol White" },
  ];

  for (const sub of subscribers) {
    await prisma.subscriber.create({
      data: {
        workspaceId: workspace.id,
        email: sub.email,
        name: sub.name,
        status: "ACTIVE",
        metadata: { source: "demo_seed" },
      },
    });
  }

  console.log(`✅ Created ${subscribers.length} sample subscribers`);

  // Create analytics data for the past 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const orderCount = Math.floor(Math.random() * 3);
    const gmv = orderCount * 49.99;
    const visitorCount = Math.floor(Math.random() * 100) + 20;
    const pageViewCount = visitorCount * (Math.floor(Math.random() * 3) + 2);

    await prisma.analyticsDaily.upsert({
      where: {
        workspaceId_date: {
          workspaceId: workspace.id,
          date,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        date,
        gmv,
        feeAmount: 0, // 0% transaction fees
        netRevenue: gmv,
        orderCount,
        refundCount: 0,
        conversionRate: orderCount > 0 ? (orderCount / visitorCount) * 100 : 0,
        visitorCount,
        pageViewCount,
        topProducts: JSON.stringify([
          { productId: courseProduct.id, name: courseProduct.name, revenue: gmv, orders: orderCount },
        ]),
        emailSent: Math.floor(Math.random() * 50) + 10,
        emailOpened: Math.floor(Math.random() * 30) + 5,
        emailClicked: Math.floor(Math.random() * 10) + 2,
      },
    });
  }

  console.log(`✅ Created 30 days of analytics data`);

  console.log("\n🎉 Database seeded successfully!\n");
  console.log("Demo workspace: @alexrivera");
  console.log("Products:");
  console.log("  - Master Productivity in 30 Days ($49.99)");
  console.log("  - The Productivity Playbook ($19.99)");
  console.log("  - Daily Planner Template (Free)");
  console.log("\nYou can now:");
  console.log("1. Sign up and create your own workspace");
  console.log("2. Visit /@alexrivera to see the demo storefront");
  console.log("3. Connect Stripe to enable real payments");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });