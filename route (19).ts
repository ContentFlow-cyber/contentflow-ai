import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError } from "@/lib/api";
import { StripeNotConfiguredError, getStripe, siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe Customer Portal: payment methods and invoices. */
export async function POST() {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  try {
    const stripe = getStripe();
    const admin = createAdminClient();
    const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (!sub?.stripe_customer_id) return jsonError("You have no billing profile yet. Make a purchase first.", 400);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl()}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof StripeNotConfiguredError) {
      return jsonError("Payments are not configured yet. The site owner must set STRIPE_SECRET_KEY.", 503, { code: "not_configured" });
    }
    await logError("portal", e instanceof Error ? e.message : String(e), {}, user.id);
    return jsonError("Could not open the billing portal. In Stripe, save the Customer Portal settings once (Settings > Billing > Customer portal).", 502);
  }
}
