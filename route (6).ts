import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError } from "@/lib/api";
import { decryptToken } from "@/lib/crypto";
import { isProvider, revokeToken } from "@/lib/social";

// Disconnect: revoke on the platform when possible (best effort), then always delete our stored tokens.
// Already-synced posts are kept as the user's records; they can delete them in Results.
export async function DELETE(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return jsonError("Unknown provider.", 404);
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);

  const admin = createAdminClient();
  const { data: conn } = await admin.from("social_connections").select("id,access_token_enc").eq("user_id", user.id).eq("provider", provider).maybeSingle();
  if (!conn) return NextResponse.json({ ok: true });

  try {
    await revokeToken(provider, decryptToken(conn.access_token_enc));
  } catch { /* best effort: the local tokens are deleted regardless */ }

  const { error } = await admin.from("social_connections").delete().eq("id", conn.id).eq("user_id", user.id);
  if (error) return jsonError("Could not disconnect.", 500);
  return NextResponse.json({ ok: true });
}
