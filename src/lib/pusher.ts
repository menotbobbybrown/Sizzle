import { env } from "@/env";

// Minimal Pusher client for server-side events
// In production, import the full 'pusher' npm package
let pusherClient: PusherServer | null = null;

type PusherServer = {
  trigger: (channel: string, event: string, data: unknown) => Promise<void>;
};

function createPusher(): PusherServer {
  if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET) {
    // Return no-op client for development without Pusher configured
    return {
      trigger: async () => {},
    };
  }

  // Lazy-load the pusher package to avoid crashes when not configured
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Pusher = require("pusher");
    const client = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: true,
    });
    return {
      trigger: async (channel: string, event: string, data: unknown) => {
        await client.trigger(channel, event, data);
      },
    };
  } catch {
    return {
      trigger: async () => {},
    };
  }
}

export function getPusher(): PusherServer {
  if (!pusherClient) {
    pusherClient = createPusher();
  }
  return pusherClient;
}

// Channel naming convention
export const PUSHER_CHANNELS = {
  WORKSPACE: (id: string) => `workspace-${id}`,
  ADMIN: "admin-channel",
} as const;

// Event naming convention
export const PUSHER_EVENTS = {
  NEW_ORDER: "new-order",
  ORDER_STATUS: "order-status",
  PAYOUT_STATUS: "payout-status",
  CAMPAIGN_PROGRESS: "campaign-progress",
} as const;