import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { STRATEGY_GOALS } from "@/lib/strategy";

const metric = z.number().int().min(0).max(10_000_000_000).nullable();

const labels = {
  format: z.string().trim().max(60),
  topic: z.string().trim().max(80),
  objective: z.enum(STRATEGY_GOALS).nullable(),
};
const manualOnly = {
  platform: z.enum(["instagram", "tiktok", "facebook", "linkedin", "youtube", "x"]),
  title: z.string().trim().min(1).max(200),
  published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  url: z.string().trim().url().max(500).nullable().or(z.literal("")),
  views: metric, likes: metric, comments: metric, shares: metric, saves: metric, reach: metric,
};
const patchSchema = z.object({ ...labels, ...manualOnly }).partial();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = patchSchema.safeParse(await readJson(req));
  if (!parsed.success || !Object.keys(parsed.data).length) return jsonError("Invalid request.", 400);

  const admin = createAdminClient();
  const { data: row } = await admin.from("posts").select("source").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return jsonError("Not found.", 404);

  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (patch.url === "") patch.url = null;
  if (patch.published_at && String(patch.published_at) > new Date().toISOString().slice(0, 10)) {
    return jsonError("The publication date cannot be in the future.", 400);
  }
  // Synced numbers come from the platform and must not be edited: only the user's own labels can change.
  if (row.source === "synced") {
    for (const k of Object.keys(manualOnly)) delete patch[k];
    if (Object.keys(patch).length === 1) return jsonError("Synced results come from the platform and cannot be edited.", 400);
  }

  const { data, error } = await admin.from("posts").update(patch).eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
  if (error) return jsonError("Could not update.", 500);
  if (!data) return jsonError("Not found.", 404);
  return NextResponse.json({ post: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  const { error } = await admin.from("posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError("Could not delete.", 500);
  return NextResponse.json({ ok: true });
}
