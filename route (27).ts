import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";

const schema = z.object({
  finding_id: z.string().trim().min(1).max(120),
  status: z.enum(["accepted", "rejected", "skipped"]),
});

export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const admin = createAdminClient();
  const { error } = await admin
    .from("recommendation_feedback")
    .upsert(
      { user_id: user.id, finding_id: parsed.data.finding_id, status: parsed.data.status },
      { onConflict: "user_id,finding_id" },
    );
  if (error) return jsonError("Could not save your answer.", 500);
  return NextResponse.json({ ok: true });
}
