import { Inngest } from "inngest";
import { env } from "@/env";

// Create the Inngest client
export const inngest = new Inngest({
  id: "sizzle",
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl: process.env.INNGEST_BASE_URL,
});

// Inngest event types
export const INNGEST_EVENTS = {
  // Checkout/Payment events
  CHECKOUT_COMPLETED: "checkout/completed",
  ORDER_PAID: "order/paid",
  
  // Booking events
  BOOKING_CREATED: "booking/created",
  BOOKING_CANCELLED: "booking/cancelled",
  BOOKING_COMPLETED: "booking/completed",
  
  // Subscription events
  SUBSCRIPTION_CREATED: "subscription/created",
  SUBSCRIPTION_CANCELED: "subscription/canceled",
  SUBSCRIPTION_RENEWED: "subscription/renewed",
  INVOICE_PAYMENT_FAILED: "invoice/payment_failed",
  
  // Course events
  ENROLLMENT_CREATED: "enrollment/created",
  LESSON_COMPLETED: "lesson/completed",
  COURSE_COMPLETED: "course/completed",
  
  // Analytics events
  ANALYTICS_SYNC: "analytics/sync",
} as const;

export type InngestEventType = (typeof INNGEST_EVENTS)[keyof typeof INNGEST_EVENTS];

// Helper to send events
export async function sendInngestEvent<T extends Record<string, unknown>>(
  name: InngestEventType,
  data: T
) {
  return inngest.send({
    name,
    data,
  });
}