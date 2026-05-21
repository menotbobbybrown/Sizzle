import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { PRICING } from "@/config/pricing";

export const billingRouter = createTRPCRouter({
  createCheckoutSession: creatorProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tier = PRICING.tiers.find((t) => t.id === input.planId);
      if (!tier) {
        throw new Error("Invalid plan selected");
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.session.user.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: tier.name },
              unit_amount: tier.price,
              recurring: { interval: tier.interval },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
        metadata: {
          workspaceId: ctx.workspace.id,
          planId: tier.id,
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
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    };
  }),

  createPortalSession: creatorProcedure.mutation(async ({ ctx }) => {
    if (!ctx.workspace.stripeSubscriptionId) {
      throw new Error("No active subscription");
    }

    // Retrieve subscription to get the customer ID
    const subscription = await stripe.subscriptions.retrieve(
      ctx.workspace.stripeSubscriptionId
    );

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return { url: portalSession.url };
  }),
});