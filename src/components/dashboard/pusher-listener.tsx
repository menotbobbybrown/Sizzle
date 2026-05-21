"use client";

import { useEffect } from "react";
import Pusher from "pusher-js";
import { toast } from "sonner";

export function PusherListener({ workspaceId }: { workspaceId: string }) {
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";

    if (!pusherKey) return;

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channelName = `private-workspace-${workspaceId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("new-sale", (data: { amount: number; customerName: string; productNames: string[] }) => {
      toast.success(`New Sale! ${data.customerName} just bought ${data.productNames.join(", ")} for $${data.amount}`, {
        duration: 5000,
      });
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [workspaceId]);

  return null;
}
