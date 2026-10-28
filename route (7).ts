import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAuthedUser } from "@/lib/api";
import { encryptionConfigured } from "@/lib/crypto";
import { authorizeUrl, credentials, isProvider, siteUrl } from "@/lib/social";

// Starts the official OAuth flow. The user is sent to the platform's own consent screen:
// ContentFlow never sees or asks for a social-network password.
export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const back = (code: string) => NextResponse.redirect(`${siteUrl()}/dashboard/connections?error=${code}`);
  if (!isProvider(provider)) return back("unknown_provider");

  const { user } = await getAuthedUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/login?next=/dashboard/connections`);
  if (!credentials(provider)) return back("not_configured");
  if (!encryptionConfigured()) return back("no_encryption_key");

  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(provider, state));
  res.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true, secure: siteUrl().startsWith("https://"), sameSite: "lax", path: "/api/social", maxAge: 600,
  });
  return res;
}
