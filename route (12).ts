import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { STRATEGY_GOALS } from "@/lib/strategy";

const POST_PLATFORMS = ["instagram", "tiktok", "facebook", "linkedin", "youtube", "x"] as const;
const metric = z.number().int().min(0).max(10_000_000_000).nullish();

const schema = z.object({
  platform: z.enum(POST_PLATFORMS),
  title: z.string().trim().min(1, "Please enter a title or short description.").max(200),
  format: z.string().trim().max(60).default(""),
  topic: z.string().trim().max(80).default(""),
  objective: z.enum(STRATEGY_GOALS).nullish(),
  published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter the publication date."),
  url: z.string().trim().url().max(500).nullish().or(z.literal("")),
  generation_id: z.string().uuid().nullish(),
  views: metric,
  likes: metric,
  comments: metric,
  shares: metric,
  saves: metric,
  reach: metric,
});

export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  const d = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  if (d.published_at > today) return jsonError("The publication date cannot be in the future.", 400);

  const admin = createAdminClient();
  if (d.generation_id) {
    const { data: g } = await admin.from("generations").select("id").eq("id", d.generation_id).eq("user_id", user.id).maybeSingle();
    if (!g) return jsonError("The linked creation was not found.", 404);
  }

  const { data, error } = await admin
    .from("posts")
    .insert({
      user_id: user.id,
      source: "manual",
      platform: d.platform,
      title: d.title,
      format: d.format,
      topic: d.topic,
      objective: d.objective ?? null,
      published_at: d.published_at,
      url: d.url || null,
      generation_id: d.generation_id ?? null,
      views: d.views ?? null,
      likes: d.likes ?? null,
      comments: d.comments ?? null,
      shares: d.shares ?? null,
      saves: d.saves ?? null,
      reach: d.reach ?? null,
    })
    .select("*")
    .single();
  if (error) return jsonError("Could not save the result.", 500);
  return NextResponse.json({ post: data });
}
