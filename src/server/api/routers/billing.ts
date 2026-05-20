import { z } from "zod";
import { createTRPCRouter, creatorProcedure } from "@/server/api/trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { SAAS_PLANS } from "@/config/pricing";

export const billingRouter = createTRPCRouter({
  createCheckoutSession: creatorProcedure
    .input(z.object({ planId: z.enum(["BASIC", "PRO"]) }))
    .mutation(async ({ ctx, input }) => {
      const plan = SAAS_PLANS[input.planId];
      
      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.session.user.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Sizzle ${plan.name} Plan`,
              },
              unit_amount: plan.price * 100,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${env.NEXTAUTH_URL}/dashboard/billing?success=true`,
        cancel_url: `${env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
        metadata: {
          tenantId: ctx.tenant.id,
        },
      });

      return { url: session.url };
    }),
});
