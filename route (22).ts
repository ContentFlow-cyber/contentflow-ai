import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { getPlan, getWallet } from "@/lib/wallet";
import type { PlanId } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  voice: z.string().trim().max(1500).default(""),
});

export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Please enter a brand name.", 400);

  const admin = createAdminClient();
  const wallet = await getWallet(user.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  if (!plan || plan.max_brands < 1) return jsonError("Brands are available on the Pro plan and above.", 403, { code: "plan_required", required: "pro" });

  const { count } = await admin.from("brands").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= plan.max_brands) {
    return jsonError(`Your plan allows up to ${plan.max_brands} brand(s).`, 403, { code: "limit_reached" });
  }
  const { data, error } = await admin.from("brands").insert({ ...parsed.data, user_id: user.id }).select("*").single();
  if (error) return jsonError("Could not create the brand.", 500);
  return NextResponse.json({ brand: data });
}
