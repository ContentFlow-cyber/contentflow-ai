import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError, readJson } from "@/lib/api";
import { StripeNotConfiguredError, getStripe, siteUrl } from "@/lib/stripe";
import type { CoinPackage, Plan } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("subscription"),
    plan: z.enum(["pro", "business"]),
    interval: z.enum(["month", "year"]),
    currency: z.enum(["eur", "usd"]),
  }),
  z.object({
    kind: z.literal("coins"),
    package_id: z.string().uuid(),
    currency: z.enum(["eur", "usd"]),
  }),
]);

/**
 * Prices come from the database (editable in the Admin panel), never from the browser.
 * Nothing is granted here: plan changes and coins are applied ONLY by the verified webhook.
 */
export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Invalid request.", 400);
  const body = parsed.data;

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    if (e instanceof StripeNotConfiguredError) {
      return jsonError("Payments are not configured yet. The site owner must set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.", 503, { code: "not_configured", missing: e.missing });
    }
    throw e;
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return jsonError("Payments are not fully configured: STRIPE_WEBHOOK_SECRET is missing, so purchases could not be confirmed.", 503, { code: "not_configured", missing: "STRIPE_WEBHOOK_SECRET" });
  }

  const admin = createAdminClient();
  try {
    // Customer
    const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    let customerId: string | null = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customerId = customer.id;
      await admin.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    if (body.kind === "coins") {
      const { data: pack } = await admin.from("coin_packages").select("*").eq("id", body.package_id).eq("is_active", true).maybeSingle();
      if (!pack) return jsonError("Coin package not found.", 404);
      const p = pack as CoinPackage;
      const amount = body.currency === "eur" ? p.price_eur : p.price_usd;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: body.currency,
              unit_amount: amount,
              product_data: { name: `ContentFlow AI — ${p.name} (${p.coins} coins)` },
            },
          },
        ],
        invoice_creation: { enabled: true },
        metadata: { kind: "coins", user_id: user.id, package_id: p.id, coins: String(p.coins) },
        success_url: `${siteUrl()}/dashboard/coins?checkout=success`,
        cancel_url: `${siteUrl()}/dashboard/coins?checkout=cancelled`,
      });
      return NextResponse.json({ url: session.url });
    }

    // Subscription
    const { data: planRow } = await admin.from("plans").select("*").eq("id", body.plan).maybeSingle();
    if (!planRow) return jsonError("Plan not found.", 404);
    const plan = planRow as Plan;
    const amount =
      body.currency === "eur"
        ? body.interval === "month" ? plan.price_eur_month : plan.price_eur_year
        : body.interval === "month" ? plan.price_usd_month : plan.price_usd_year;
    if (amount <= 0) return jsonError("This plan has no price configured. Set it in the Admin panel.", 503, { code: "not_configured", missing: `plans.${plan.id}.price` });

    // Existing active subscription: change plan in place with proration.
    if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) {
      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const item = current.items.data[0];
      if (!item) return jsonError("Could not find your current subscription item.", 500);
      if (current.currency !== body.currency) {
        return jsonError(`Your subscription is billed in ${current.currency.toUpperCase()}. Cancel it first to switch currency.`, 400);
      }
      const product = await stripe.products.create({ name: `ContentFlow AI ${plan.name}`, metadata: { plan: plan.id } });
      await stripe.subscriptions.update(current.id, {
        items: [
          {
            id: item.id,
            price_data: {
              currency: body.currency,
              product: product.id,
              unit_amount: amount,
              recurring: { interval: body.interval },
            },
          },
        ],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
        metadata: { user_id: user.id, plan: plan.id },
      });
      // The webhook (customer.subscription.updated) applies the new plan and coins.
      return NextResponse.json({ updated: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: body.currency,
            unit_amount: amount,
            recurring: { interval: body.interval },
            product_data: { name: `ContentFlow AI ${plan.name}` },
          },
        },
      ],
      metadata: { kind: "subscription", user_id: user.id, plan: plan.id },
      subscription_data: { metadata: { user_id: user.id, plan: plan.id } },
      success_url: `${siteUrl()}/dashboard/billing?checkout=success`,
      cancel_url: `${siteUrl()}/dashboard/billing?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    await logError("checkout", e instanceof Error ? e.message : String(e), { kind: body.kind }, user.id);
    return jsonError("Could not start checkout. Please try again.", 502);
  }
}
