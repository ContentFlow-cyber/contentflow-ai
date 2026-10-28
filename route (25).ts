import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { getPlan, getWallet } from "@/lib/wallet";
import type { PlanId } from "@/lib/types";

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().trim().min(1).max(40),
  topic: z.string().trim().min(1).max(300),
  format: z.string().trim().max(80).default(""),
  idea: z.string().trim().max(1500).default(""),
  status: z.enum(["planned", "draft", "published"]).default("planned"),
  brand_id: z.string().uuid().nullish(),
});

const bodySchema = z.object({ entries: z.array(entrySchema).min(1).max(60) });

export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = bodySchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const admin = createAdminClient();
  const wallet = await getWallet(user.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  if (!plan?.can_calendar) return jsonError("The calendar is available on the Pro plan and above.", 403, { code: "plan_required", required: "pro" });

  // Verify any brand ids belong to the user.
  const brandIds = [...new Set(parsed.data.entries.map((e) => e.brand_id).filter(Boolean))] as string[];
  if (brandIds.length) {
    const { data: owned } = await admin.from("brands").select("id").eq("user_id", user.id).in("id", brandIds);
    if ((owned ?? []).length !== brandIds.length) return jsonError("Brand not found.", 404);
  }

  const rows = parsed.data.entries.map((e) => ({ ...e, brand_id: e.brand_id ?? null, user_id: user.id }));
  const { data, error } = await admin.from("calendar_entries").insert(rows).select("*");
  if (error) return jsonError("Could not save the entries.", 500);
  return NextResponse.json({ entries: data });
}
