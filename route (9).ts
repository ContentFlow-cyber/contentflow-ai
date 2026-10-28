import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError } from "@/lib/api";
import { isProvider } from "@/lib/social";
import { syncProvider } from "@/lib/social-sync";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return jsonError("Unknown provider.", 404);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);

  const r = await syncProvider(createAdminClient(), user.id, provider);
  if (!r.ok) return jsonError(r.error, r.status, { needsReconnect: r.needsReconnect ?? false });
  return NextResponse.json({ ok: true, inserted: r.inserted, updated: r.updated });
}
