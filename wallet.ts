import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan, PlanId, SubscriptionRow, ToolCost, Wallet, CoinPackage } from "./types";

/** Refreshes (monthly allowance, plan change) and returns the wallet. Service role only. */
export async function getWallet(userId: string, admin: SupabaseClient = createAdminClient()): Promise<Wallet> {
  const { data, error } = await admin.rpc("refresh_wallet", { p_user: userId });
  if (error) throw new Error(`refresh_wallet failed: ${error.message}`);
  return data as Wallet;
}

export async function getPlans(client: SupabaseClient): Promise<Plan[]> {
  const { data } = await client.from("plans").select("*").order("sort");
  return (data ?? []) as Plan[];
}

export async function getPlan(client: SupabaseClient, id: PlanId): Promise<Plan | null> {
  const { data } = await client.from("plans").select("*").eq("id", id).maybeSingle();
  return (data as Plan | null) ?? null;
}

export async function getToolCosts(client: SupabaseClient): Promise<ToolCost[]> {
  const { data } = await client.from("tool_costs").select("*").order("sort");
  return (data ?? []) as ToolCost[];
}

export async function getPackages(client: SupabaseClient): Promise<CoinPackage[]> {
  const { data } = await client.from("coin_packages").select("*").eq("is_active", true).order("sort");
  return (data ?? []) as CoinPackage[];
}

export async function getSubscription(client: SupabaseClient, userId: string): Promise<SubscriptionRow | null> {
  const { data } = await client
    .from("subscriptions")
    .select("plan,status,interval,currency,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

export function monthStartIso(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString();
}

/** Coins spent since the start of the current UTC month (positive number). */
export async function coinsUsedThisMonth(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client
    .from("coin_ledger")
    .select("delta,reason")
    .eq("user_id", userId)
    .gte("created_at", monthStartIso());
  const net = (data ?? [])
    .filter((r: { reason: string }) => r.reason.startsWith("spend:") || r.reason.startsWith("refund:"))
    .reduce((s: number, r: { delta: number }) => s + r.delta, 0);
  return Math.max(0, -net);
}
