import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { inngestFunctions } from "@/inngest/functions/post-purchase";

// Create the Inngest serve handler
const handler = serve({
  client: inngest,
  functions: inngestFunctions,
  streaming: {
    fetch: (request) => {
      // Allow streaming responses from Vercel Edge or Node.js runtimes
      return new Response(null, {
        status: request ? 200 : 404,
      });
    },
  },
});

export const { GET, POST, PUT } = handler;