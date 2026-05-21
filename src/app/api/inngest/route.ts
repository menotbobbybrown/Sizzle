import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { postPurchase, bookingCreated, bookingCancelled, courseCompleted } from "@/inngest/functions/post-purchase";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    postPurchase,
    bookingCreated,
    bookingCancelled,
    courseCompleted,
  ],
});
