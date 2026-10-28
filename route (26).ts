import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { getPlan, getWallet } from "@/lib/wallet";
import type { PlanId } from "@/lib/types";

const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  platform: z.string().trim().min(1).max(40).optional(),
  topic: z.string().trim().min(1).max(300).optional(),
  format: z.string().trim().max(80).optional(),
  idea: z.string().trim().max(1500).optional(),
  status: z.enum(["planned", "draft", "published"]).optional(),
});

async function guard(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { error: jsonError("Invalid id.", 400) } as const;
  const { user } = await getAuthedUser();
  if (!user) return { error: jsonError("Please log in.", 401) } as const;
  const admin = createAdminClient();
  const wallet = await getWallet(user.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  if (!plan?.can_calendar) return { error: jsonError("The calendar is available on the Pro plan and above.", 403) } as const;
  return { user, admin } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const parsed = patchSchema.safeParse(await readJson(req));
  if (!parsed.success || !Object.keys(parsed.data).length) return jsonError("Invalid request.", 400);
  const { data, error } = await g.admin
    .from("calendar_entries")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", g.user.id)
    .select("*")
    .maybeSingle();
  if (error) return jsonError("Could not update.", 500);
  if (!data) return jsonError("Not found.", 404);
  return NextResponse.json({ entry: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const { error } = await g.admin.from("calendar_entries").delete().eq("id", id).eq("user_id", g.user.id);
  if (error) return jsonError("Could not delete.", 500);
  return NextResponse.json({ ok: true });
}
