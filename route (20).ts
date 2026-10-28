import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { getPlan, getWallet } from "@/lib/wallet";
import type { PlanId } from "@/lib/types";

// All mutations use the service role with an explicit user_id filter (browser clients are read-only).

const patchSchema = z.object({
  is_favorite: z.boolean().optional(),
  text: z.string().max(50_000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = patchSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const admin = createAdminClient();
  const wallet = await getWallet(user.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  if (parsed.data.is_favorite !== undefined && !plan?.can_favorite) {
    return jsonError("Favorites are available on the Pro plan and above.", 403, { code: "plan_required", required: "pro" });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.is_favorite !== undefined) patch.is_favorite = parsed.data.is_favorite;
  if (parsed.data.text !== undefined) patch.text = parsed.data.text;
  if (!Object.keys(patch).length) return jsonError("Nothing to update.", 400);

  const { data, error } = await admin
    .from("generations")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) return jsonError("Could not update.", 500);
  if (!data) return jsonError("Not found.", 404);
  return NextResponse.json({ generation: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();

  const { data: row } = await admin.from("generations").select("output").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return jsonError("Not found.", 404);
  const path = (row.output as { image_path?: string } | null)?.image_path;
  if (path && path.startsWith(`${user.id}/`)) await admin.storage.from("generated-images").remove([path]);

  const { error } = await admin.from("generations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError("Could not delete.", 500);
  return NextResponse.json({ ok: true });
}

/** Duplicate a saved creation (no coins charged: it is a copy). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  const { data: row } = await admin.from("generations").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return jsonError("Not found.", 404);
  if ((row.output as { image_path?: string } | null)?.image_path) return jsonError("Images cannot be duplicated.", 400);

  const { data, error } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      tool: row.tool,
      brand_id: row.brand_id,
      title: `${row.title} (copy)`.slice(0, 120),
      input: row.input,
      output: row.output,
      text: row.text,
      coins_spent: 0,
    })
    .select("*")
    .single();
  if (error) return jsonError("Could not duplicate.", 500);
  return NextResponse.json({ generation: data });
}
