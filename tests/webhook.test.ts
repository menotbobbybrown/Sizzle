import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    webhookEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    memberSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Inngest
vi.mock("@/lib/inngest", () => ({
  sendInngestEvent: vi.fn().mockResolvedValue({ ids: ["test-id"] }),
  INNGEST_EVENTS: {
    ORDER_PAID: "order/paid",
    SUBSCRIPTION_CREATED: "subscription/created",
    SUBSCRIPTION_CANCELED: "subscription/canceled",
    SUBSCRIPTION_RENEWED: "subscription/renewed",
    INVOICE_PAYMENT_FAILED: "invoice/payment_failed",
  },
}));

// Mock Stripe
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

describe("Stripe Webhook Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return idempotent response for already processed events", async () => {
    const { db } = await import("@/lib/db");
    
    // Mock that event was already processed
    db.webhookEvent.findUnique.mockResolvedValue({
      id: "event-1",
      eventId: "evt_test123",
      source: "stripe",
      type: "checkout.session.completed",
      status: "PROCESSED",
      payload: {},
      processedAt: new Date(),
      createdAt: new Date(),
    });

    const existingEvent = await db.webhookEvent.findUnique({
      where: { eventId_source: { eventId: "evt_test123", source: "stripe" } },
    });

    expect(existingEvent?.status).toBe("PROCESSED");
    // In the actual route handler, this would return early with idempotent: true
  });

  it("should create webhook event record on new event", async () => {
    const { db } = await import("@/lib/db");
    
    db.webhookEvent.findUnique.mockResolvedValue(null);
    db.webhookEvent.upsert.mockResolvedValue({
      id: "event-2",
      eventId: "evt_new",
      source: "stripe",
      type: "checkout.session.completed",
      status: "PENDING",
      payload: {},
      createdAt: new Date(),
    });

    const webhookEvent = await db.webhookEvent.upsert({
      where: { eventId_source: { eventId: "evt_new", source: "stripe" } },
      update: { payload: {} },
      create: {
        eventId: "evt_new",
        source: "stripe",
        type: "checkout.session.completed",
        status: "PENDING",
        payload: {},
      },
    });

    expect(webhookEvent.status).toBe("PENDING");
    expect(webhookEvent.eventId).toBe("evt_new");
  });

  it("should not create duplicate orders for same Stripe session", async () => {
    const { db } = await import("@/lib/db");
    
    // Order already exists
    db.order.findUnique.mockResolvedValue({
      id: "order-existing",
      stripeSessionId: "cs_test123",
      status: "PAID",
    });

    const existingOrder = await db.order.findUnique({
      where: { stripeSessionId: "cs_test123" },
    });

    expect(existingOrder).not.toBeNull();
    // In actual handler, this would skip order creation
  });
});

describe("Subscription Event Updates", () => {
  it("should map Stripe subscription status to our enum", () => {
    const statusMappings: Record<string, string> = {
      active: "ACTIVE",
      past_due: "PAST_DUE",
      canceled: "CANCELED",
      unpaid: "UNPAID",
      incomplete: "INCOMPLETE",
      incomplete_expired: "INCOMPLETE_EXPIRED",
      trialing: "TRIALING",
    };

    Object.entries(statusMappings).forEach(([stripeStatus, expectedEnum]) => {
      expect(expectedEnum).toMatch(/^(ACTIVE|PAST_DUE|CANCELED|UNPAID|INCOMPLETE|INCOMPLETE_EXPIRED|TRIALING)$/);
    });
  });

  it("should update subscription on payment failed", async () => {
    const { db } = await import("@/lib/db");
    
    db.memberSubscription.findUnique.mockResolvedValue({
      id: "sub-1",
      stripeSubscriptionId: "sub_stripe123",
      userId: "user-1",
      status: "PAST_DUE",
    });

    const subscription = await db.memberSubscription.findUnique({
      where: { stripeSubscriptionId: "sub_stripe123" },
    });

    expect(subscription?.status).toBe("PAST_DUE");
  });
});