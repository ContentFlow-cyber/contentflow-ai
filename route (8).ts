import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, logError } from "@/lib/api";
import { encryptToken, encryptionConfigured } from "@/lib/crypto";
import { credentials, exchangeCode, isProvider, siteUrl } from "@/lib/social";
import { syncProvider } from "@/lib/social-sync";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const back = (q: string) => {
    const r = NextResponse.redirect(`${siteUrl()}/dashboard/connections?${q}`);
    r.cookies.delete({ name: `oauth_state_${provider}`, path: "/api/social" });
    return r;
  };
  if (!isProvider(provider)) return back("error=unknown_provider");

  const { user } = await getAuthedUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/login?next=/dashboard/connections`);

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back("error=denied"); // user declined on the platform

  const jar = await cookies();
  const expected = jar.get(`oauth_state_${provider}`)?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!expected || !state || !safeEqual(expected, state)) return back("error=invalid_state");
  if (!code) return back("error=no_code");
  if (!credentials(provider)) return back("error=not_configured");
  if (!encryptionConfigured()) return back("error=no_encryption_key");

  const admin = createAdminClient();
  try {
    const t = await exchangeCode(provider, code);
    const exp = (s?: number | null) => (s ? new Date(Date.now() + s * 1000).toISOString() : null);
    const { error } = await admin.from("social_connections").upsert({
      user_id: user.id, provider,
      account_id: t.accountId ?? null, username: t.username ?? null,
      access_token_enc: encryptToken(t.accessToken),
      refresh_token_enc: t.refreshToken ? encryptToken(t.refreshToken) : null,
      expires_at: exp(t.expiresIn), refresh_expires_at: exp(t.refreshExpiresIn),
      scopes: t.scopes ?? null, status: "connected", last_error: null, last_synced_at: null,
    }, { onConflict: "user_id,provider" });
    if (error) throw new Error("db");
  } catch (e) {
    await logError("social.callback", e instanceof Error ? e.message : "failed", { provider }, user.id);
    return back("error=connect_failed");
  }

  const r = await syncProvider(admin, user.id, provider);
  return back(r.ok ? "connected=1" : "connected=1&sync_error=1");
}
