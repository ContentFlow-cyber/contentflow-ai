import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** GDPR: export all personal data as JSON. */
export async function GET() {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  const tables = ["profiles", "preferences", "wallets", "coin_ledger", "subscriptions", "payments", "brands", "generations", "calendar_entries", "strategy_profiles", "posts", "recommendation_feedback"];
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const t of tables) {
    const col = t === "profiles" ? "id" : "user_id";
    const { data } = await admin.from(t).select("*").eq(col, user.id);
    out[t] = data ?? [];
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="contentflow-data.json"',
    },
  });
}

/** GDPR: delete the account and all data. Cancels any active Stripe subscription first. */
export async function DELETE() {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  try {
    const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id,status").eq("user_id", user.id).maybeSingle();
    if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        await logError("account-delete", `Stripe cancel failed: ${String(e)}`, {}, user.id);
        return jsonError("Could not cancel your subscription, so the account was not deleted. Please try again or contact support.", 502);
      }
    }
    const { data: files } = await admin.storage.from("generated-images").list(user.id, { limit: 1000 });
    if (files?.length) await admin.storage.from("generated-images").remove(files.map((f) => `${user.id}/${f.name}`));

    const { data: av } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
    if (av?.length) await admin.storage.from("avatars").remove(av.map((f) => `${user.id}/${f.name}`));

    const { error } = await admin.auth.admin.deleteUser(user.id); // cascades to all user tables
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("account-delete", e instanceof Error ? e.message : String(e), {}, user.id);
    return jsonError("Could not delete the account.", 500);
  }
}
