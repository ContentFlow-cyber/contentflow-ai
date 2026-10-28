import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, readJson } from "@/lib/api";

const schema = z
  .object({
    nickname: z.string().trim().max(40),
    full_name: z.string().trim().max(80),
    gender: z.enum(["female", "male", "other", "prefer_not"]).nullable(),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
  .partial();

export async function PATCH(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !Object.keys(parsed.data).length) return jsonError("Invalid request.", 400);
  const d = parsed.data;
  if (d.birthday) {
    const t = new Date(d.birthday + "T00:00:00Z");
    const now = new Date();
    if (Number.isNaN(t.getTime()) || t > now || t.getUTCFullYear() < 1900) return jsonError("Please enter a valid birthday.", 400);
  }
  const { data, error } = await createAdminClient()
    .from("profiles").update(d).eq("id", user.id)
    .select("nickname,full_name,gender,birthday,avatar_url").maybeSingle();
  if (error || !data) return jsonError("Could not save.", 500);
  return NextResponse.json({ profile: data });
}
