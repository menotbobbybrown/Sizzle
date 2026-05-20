import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { PRICING } from "@/config/pricing";

export const billingRouter = createTRPCRouter({
  createCheckoutSession: creatorProcedure
    .mutation(async ({ ctx }) => {
      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.session.user.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: PRICING.name },
              unit_amount: PRICING.price,
              recurring: { interval: PRICING.interval },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
        metadata: {
          workspaceId: ctx.workspace.id,
        },
      });

      return { url: session.url };
    }),

  getSubscription: creatorProcedure.query(async ({ ctx }) => {
    if (!ctx.workspace.stripeSubscriptionId) {
      return null;
    }
    const subscription = await stripe.subscriptions.retrieve(
      ctx.workspace.stripeSubscriptionId
    );
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }),

  createPortalSession: creatorProcedure.mutation(async ({ ctx }) => {
    if (!ctx.workspace.stripeSubscriptionId) {
      throw new Error("No active subscription");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: ctx.workspace.stripeSubscriptionId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return { url: portalSession.url };
  }),
});