import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { inngestFunctions } from "@/inngest/functions/post-purchase";

// Create the Inngest serve handler. Streaming is left at its default; the
// previous custom `streaming.fetch` returned an empty Response and only
// hijacked the request, which is not how the option works.
const handler = serve({
  client: inngest,
  functions: inngestFunctions,
});

export const { GET, POST, PUT } = handler;
