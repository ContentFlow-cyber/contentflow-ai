import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError, readJson } from "@/lib/api";
import { StripeNotConfiguredError, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["cancel", "resume"]) });

/** Cancel at period end (user keeps access until the paid period ends) or undo that. */
export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  try {
    const stripe = getStripe();
    const admin = createAdminClient();
    const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id,status").eq("user_id", user.id).maybeSingle();
    if (!sub?.stripe_subscription_id) return jsonError("You have no active subscription.", 400);
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: parsed.data.action === "cancel",
    });
    // Optimistic local update; the webhook confirms and is the source of truth.
    await admin
      .from("subscriptions")
      .update({ cancel_at_period_end: parsed.data.action === "cancel", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StripeNotConfiguredError) return jsonError("Payments are not configured yet.", 503);
    await logError("subscription", e instanceof Error ? e.message : String(e), {}, user.id);
    return jsonError("Could not update your subscription.", 502);
  }
}
