import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe's API shape moved some fields between versions; read them defensively.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

function periodEnd(sub: Loose): string | null {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

async function userIdForCustomer(admin: SupabaseClient, customer: string | null | undefined): Promise<string | null> {
  if (!customer) return null;
  const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customer).maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(admin: SupabaseClient, subscription: Stripe.Subscription) {
  const sub = subscription as unknown as Loose;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const userId: string | null = sub.metadata?.user_id || (await userIdForCustomer(admin, customerId));
  if (!userId) throw new Error(`No user for subscription ${sub.id}`);

  const planMeta = sub.metadata?.plan;
  const plan = planMeta === "pro" || planMeta === "business" ? planMeta : null;
  if (!plan) throw new Error(`Subscription ${sub.id} has no valid plan metadata`);

  const price = sub.items?.data?.[0]?.price;
  const interval = price?.recurring?.interval === "year" ? "year" : "month";

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: sub.status, // active | trialing | past_due | canceled | unpaid | incomplete ...
      interval,
      currency: sub.currency ?? price?.currency ?? null,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd(sub),
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Subscription upsert failed: ${error.message}`);

  // Apply the effective plan's monthly coins (no-op if nothing changed).
  const { error: rpcErr } = await admin.rpc("refresh_wallet", { p_user: userId });
  if (rpcErr) throw new Error(`refresh_wallet failed: ${rpcErr.message}`);
}

async function creditCoinPurchase(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return; // async methods: wait for async_payment_succeeded
  const m = session.metadata ?? {};
  if (m.kind !== "coins" || !m.user_id) return;

  // Trust the database, not the metadata, for how many coins the package gives.
  const { data: pack } = await admin.from("coin_packages").select("coins").eq("id", m.package_id).maybeSingle();
  const coins = pack?.coins ?? Number(m.coins);
  if (!Number.isInteger(coins) || coins <= 0) throw new Error(`Invalid coin amount for session ${session.id}`);

  const { error } = await admin.rpc("grant_coins", {
    p_user: m.user_id,
    p_amount: coins,
    p_bucket: "purchased",
    p_reason: "purchase",
    p_key: `session:${session.id}`, // idempotent: replays never double-credit
    p_meta: { package_id: m.package_id, amount: session.amount_total, currency: session.currency },
    p_actor: null,
  });
  if (error) throw new Error(`grant_coins failed: ${error.message}`);

  await admin.from("payments").upsert(
    {
      user_id: m.user_id,
      kind: "coins",
      stripe_ref: `session:${session.id}`,
      amount: session.amount_total ?? 0,
      currency: session.currency,
      coins,
      status: "paid",
    },
    { onConflict: "stripe_ref", ignoreDuplicates: true },
  );
}

async function recordInvoice(admin: SupabaseClient, invoice: Stripe.Invoice) {
  const inv = invoice as unknown as Loose;
  const hasSubscription = Boolean(inv.subscription ?? inv.parent?.subscription_details?.subscription);
  if (!hasSubscription) return; // one-off coin purchases are recorded from the checkout session
  const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  const userId = await userIdForCustomer(admin, customerId);
  await admin.from("payments").upsert(
    {
      user_id: userId,
      kind: "subscription",
      stripe_ref: `invoice:${inv.id}`,
      amount: inv.amount_paid ?? 0,
      currency: inv.currency,
      coins: 0,
      status: "paid",
    },
    { onConflict: "stripe_ref", ignoreDuplicates: true },
  );
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });

  const raw = await req.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await creditCoinPurchase(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await recordInvoice(admin, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await logError("stripe", "Invoice payment failed", { invoice: (event.data.object as Stripe.Invoice).id });
        break;
      default:
        break;
    }
  } catch (e) {
    await logError("webhook", e instanceof Error ? e.message : String(e), { type: event.type, id: event.id });
    return NextResponse.json({ error: "Processing failed." }, { status: 500 }); // Stripe will retry
  }

  await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
