import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";
import { STRATEGY_GOALS } from "@/lib/strategy";
import { PLATFORMS } from "@/lib/tool-meta";

const schema = z.object({
  goal: z.enum(STRATEGY_GOALS),
  business_type: z.string().trim().max(200).default(""),
  audience: z.string().trim().max(300).default(""),
  platform: z.enum(PLATFORMS).nullish(),
});

export async function PUT(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Please choose your main objective.", 400);

  const admin = createAdminClient();
  const { error } = await admin.from("strategy_profiles").upsert(
    {
      user_id: user.id,
      goal: parsed.data.goal,
      business_type: parsed.data.business_type,
      audience: parsed.data.audience,
      platform: parsed.data.platform ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return jsonError("Could not save your objective.", 500);
  return NextResponse.json({ ok: true });
}
