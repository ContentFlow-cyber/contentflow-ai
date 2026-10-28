import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  voice: z.string().trim().max(1500).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !Object.keys(parsed.data).length) return jsonError("Invalid request.", 400);
  const admin = createAdminClient();
  const { data, error } = await admin.from("brands").update(parsed.data).eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
  if (error) return jsonError("Could not update.", 500);
  if (!data) return jsonError("Not found.", 404);
  return NextResponse.json({ brand: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id.", 400);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  const { error } = await admin.from("brands").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError("Could not delete.", 500);
  return NextResponse.json({ ok: true });
}
